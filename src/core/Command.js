const {readdir} = require("fs/promises");
const {readdirSync} = require("fs");

const { Collection } = require("discord.js");
/**
 * @class
 */
class Command {

	/**
	 * load all the commands from source files
	 * @return {Promise<void>}
	 */
	async static init() {
		Command.commands = new Collection();
		Command.players = new Map();

		const categories = await readdir("src/commands");
		categories.forEach(category => {
			const commandsFiles = readdirSync(`src/commands/${category}`).filter(command => command.endsWith(".js"));
			for (const commandFile of commandsFiles) {
				const command = require(`../commands/${category}/${commandFile}`);
				Command.commands.set(command.help.name, command);
			}
		});
	}

	/**
	 * Get a command
	 * @param {String} command - The command to get
	 * @return An instance of the command asked
	 */
	static getCommand(commandName) {
		return Command.commands.get(commandName)
		|| Command.commands.find(cmd => cmd.help.aliases && cmd.help.aliases.includes(commandName));
	}

	/**
	 * check if a player is blocked
	 * @param {String} id
	 */
	static hasBlockedPlayer(id) {
		if (Object.keys(Command.players).includes(id)) {
			return !(
				Command.players[id].collector &&
				Command.players[id].collector.ended
			);
		}
		return false;
	}

	/**
	 * get the reason why a player is blocked and the time he is blocked for
	 * @param {String} id
	 * @return {{context: string, time: number}}
	 */
	static getBlockedPlayer(id) {
		return Command.players[id];
	}

	/**
	 * block a player
	 * @param {String} id
	 * @param {String} context
	 * @param {module:"discord.js".ReactionCollector} collector
	 */
	static addBlockedPlayer(id, context, collector = null) {
		Command.players[id] = {context: context, collector: collector};
	}

	/**
	 * unblock a player
	 * @param {String} id
	 */
	static removeBlockedPlayer(id) {
		delete Command.players[id];
	}

	/**
	 * This function analyses the passed message and check if he can be processed
	 * @param {module:"discord.js".Message} message - Message from the discord server
	 */
	static async handleMessage(message) {

		// server check :
		const [server] = await Servers.findOrCreate({
			where: {
				discordGuildId: message.guild.id
			}
		});

		// language check
		let language = server.language;
		if (message.channel.id === JsonReader.app.ENGLISH_CHANNEL_ID) {
			language = LANGUAGE.ENGLISH;
		}

		// args loading
		const split = message.content.split(" ", 1);

		// if the bot is mentionned, send help message
		if (
			split.length > 0 &&
			split[0].match(discord.MessageMentions.USERS_PATTERN) &&
			split[0].includes(client.user.id)
		) {
			await message.channel.send(
				format(JsonReader.bot.getTranslation(language).mentionHelp, {
					prefix: server.prefix
				})
			);
			return;
		}
		if (message.mentions.has(client.user)) {
			return;
		}

		// otherwise continue

		if (server.prefix === Command.getUsedPrefix(message, server.prefix)) {

			// check maintenance mode
			if (
				message.author.id !== JsonReader.app.BOT_OWNER_ID &&
				JsonReader.app.MODE_MAINTENANCE
			) {
				return message.channel.send(
					new discord.MessageEmbed()
						.setDescription(JsonReader.bot.getTranslation(language).maintenance)
						.setTitle(":x: **Maintenance**")
						.setColor(JsonReader.bot.embed.error)
				);
			}
			await Command.launchCommand(language, server.prefix, message);
		}
		else if (
			Command.getUsedPrefix(
				message,
				JsonReader.app.BOT_OWNER_PREFIX
			) === JsonReader.app.BOT_OWNER_PREFIX &&
				message.author.id === JsonReader.app.BOT_OWNER_ID
		) {
			await Command.launchCommand(
				language,
				JsonReader.app.BOT_OWNER_PREFIX,
				message
			);
		}
	}

	/**
	 * This function analyses the passed private message and process it
	 * @param {module:"discord.js".Message} message - Message from the discord user
	 */
	static async handlePrivateMessage(message) {
		const mainServer = client.guilds.cache.get(
			JsonReader.app.MAIN_SERVER_ID
		);
		const dmChannel = mainServer.channels.cache.get(
			JsonReader.app.SUPPORT_CHANNEL_ID
		);
		if (message.attachments.size > 0) {
			await sendMessageAttachments(message, dmChannel);
		}
		let icon = "";
		const [entity] = await Entities.getOrRegister(message.author.id);
		if (!entity.Player.dmnotification) {
			icon = JsonReader.bot.dm.alertIcon;
		}
		dmChannel.send(format(JsonReader.bot.dm.supportAlert, {
			username: message.author.username,
			alertIcon: icon,
			id: message.author.id
		}) + message.content);

		const msg = await sendSimpleMessage(
			message.author,
			message.channel,
			JsonReader.bot.dm.titleSupport,
			JsonReader.bot.dm.messageSupport
		);
		msg.react(MENU_REACTION.ENGLISH_FLAG);
		msg.react(MENU_REACTION.FRENCH_FLAG);

		const filterConfirm = (reaction) => reaction.me && !reaction.users.cache.last().bot;

		const collector = msg.createReactionCollector(filterConfirm, {
			time: COLLECTOR_TIME,
			max: 1
		});

		collector.on("collect", (reaction) => {
			const language =
				reaction.emoji.name === MENU_REACTION.ENGLISH_FLAG ? LANGUAGE.ENGLISH : LANGUAGE.FRENCH;
			sendSimpleMessage(
				message.author,
				message.channel,
				format(
					JsonReader.bot.getTranslation(language).dmHelpMessageTitle,
					{pseudo: message.author.username}
				),
				JsonReader.bot.getTranslation(language).dmHelpMessage
			);
		});
	}

	/**
	 * Get the prefix that the user just used to make the command
	 * @param {*} message - The message to extract the command from
	 * @param {String} prefix - The prefix used by current server
	 * @return {String}
	 */
	static getUsedPrefix(message, prefix) {
		return message.content.substr(0, prefix.length);
	}

	/**
	 *
	 * @param {*} message - A command posted by an user.
	 * @param {String} prefix - The current prefix in the message content
	 * @param {('fr'|'en')} language - The language for the current server
	 */
	static async launchCommand(language, prefix, message) {
		if (resetIsNow()) {
			return await sendErrorMessage(
				message.author,
				message.channel,
				language,
				JsonReader.bot.getTranslation(language).resetIsNow
			);
		}

		const args = message.content.slice(prefix.length).trim()
			.split(/ +/g);

		const commandName = args.shift().toLowerCase();
		const command = this.getCommand(commandName);

		log(message.author.id + " executed in server " + message.guild.id + ": " + message.content.substr(1));
		await command.execute(message, language, args);
	}
}

/**
 * @type {{init: Command.init}}
 */
module
	.exports = {
		init: Command.init
	};

global
	.getCommand = Command.getCommand;
global
	.getBlockedPlayer = Command.getBlockedPlayer;
global
	.hasBlockedPlayer = Command.hasBlockedPlayer;
global
	.addBlockedPlayer = Command.addBlockedPlayer;
global
	.removeBlockedPlayer = Command.removeBlockedPlayer;
global
	.handleMessage = Command.handleMessage;
global
	.handlePrivateMessage = Command.handlePrivateMessage;
global
	.getMainCommandFromAlias = Command.getMainCommandFromAlias;
global
	.getAliasesFromCommand = Command.getAliasesFromCommand;
