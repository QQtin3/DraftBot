import {
	CommandGuildShelterPacketReq,
	CommandGuildShelterPacketRes
} from "../../../../Lib/src/packets/commands/CommandGuildShelterPacket";
import {makePacket, PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import {ICommand} from "../ICommand";
import {SlashCommandBuilderGenerator} from "../SlashCommandBuilderGenerator";
import {DiscordCache} from "../../bot/DiscordCache";
import {DraftBotEmbed} from "../../messages/DraftBotEmbed";
import i18n from "../../translations/i18n";
import {DisplayUtils} from "../../utils/DisplayUtils";

/**
 * Allow the player to leave its guild
 */
function getPacket(): CommandGuildShelterPacketReq {
	return makePacket(CommandGuildShelterPacketReq, {});
}

export async function handleCommandGuildShelterRes(packet: CommandGuildShelterPacketRes, context: PacketContext): Promise<void> {
	const interaction = DiscordCache.getInteraction(context.discord!.interaction);

	if (!interaction) {
		return;
	}

	const lng = context.discord!.language;

	const embed = new DraftBotEmbed()
		.setTitle(i18n.t("commands:guildShelter.embedTitle", {
			lng,
			guildName: packet.guildName,
			count: packet.pets.length,
			max: packet.maxCount
		}))
		.addFields(packet.pets.map((pet, index) => ({
			name: i18n.t("commands:guildShelter.petFieldName", { lng, number: index + 1 }),
			value: DisplayUtils.getOwnedPetFieldDisplay(pet, lng),
			inline: true
		})));

	if (packet.pets.length === packet.maxCount) {
		embed.setFooter({ text: i18n.t("commands:guildShelter.warningFull", { lng }) });
	}

	await interaction.reply({
		embeds: [embed]
	});
}

export const commandInfo: ICommand = {
	slashCommandBuilder: SlashCommandBuilderGenerator.generateBaseCommand("guildShelter"),
	getPacket,
	mainGuildCommand: false
};