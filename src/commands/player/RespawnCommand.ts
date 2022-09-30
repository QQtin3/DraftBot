import {MapLinks} from "../../core/database/game/models/MapLink";
import {Maps} from "../../core/maps/Maps";
import {PlayerSmallEvents} from "../../core/database/game/models/PlayerSmallEvent";
import {escapeUsername} from "../../core/utils/StringUtils";
import {ICommand} from "../ICommand";
import {sendBlockedError} from "../../core/utils/BlockingUtils";
import Entity from "../../core/database/game/models/Entity";
import {CommandInteraction} from "discord.js";
import {Translations} from "../../core/Translations";
import {replyErrorMessage} from "../../core/utils/ErrorUtils";
import {NumberChangeReason} from "../../core/database/logs/LogsDatabase";
import {EffectsConstants} from "../../core/constants/EffectsConstants";
import {RespawnConstants} from "../../core/constants/RespawnConstants";
import {Constants} from "../../core/Constants";
import {SlashCommandBuilderGenerator} from "../SlashCommandBuilderGenerator";
import {TravelTime} from "../../core/maps/TravelTime";

/**
 * Allow a player who is dead to respawn
 * @param interaction
 * @param {("fr"|"en")} language - Language to use in the response
 * @param entity
 */
async function executeCommand(interaction: CommandInteraction, language: string, entity: Entity): Promise<void> {
	if (await sendBlockedError(interaction, language)) {
		return;
	}
	const respawnModule = Translations.getModule("commands.respawn", language);
	if (entity.Player.effect !== EffectsConstants.EMOJI_TEXT.DEAD) {
		await replyErrorMessage(interaction, language, respawnModule.format("alive", {pseudo: await entity.Player.getPseudo(language)}));
		return;
	}
	const lostScore = Math.round(entity.Player.score * RespawnConstants.SCORE_REMOVAL_MULTIPLIER);
	await entity.addHealth(await entity.getMaxHealth() - entity.health, interaction.channel, language, NumberChangeReason.RESPAWN);
	await entity.Player.addScore({
		entity,
		amount: -lostScore,
		channel: interaction.channel,
		language: language,
		reason: NumberChangeReason.RESPAWN
	});

	await Promise.all([
		entity.save(),
		entity.Player.save()
	]);

	await TravelTime.removeEffect(entity.Player, NumberChangeReason.RESPAWN);
	await Maps.stopTravel(entity.Player);
	const newlink = await MapLinks.getLinkByLocations(
		await entity.Player.getPreviousMapId(),
		await entity.Player.getDestinationId()
	);
	await Maps.startTravel(entity.Player, newlink, interaction.createdAt.valueOf(), NumberChangeReason.RESPAWN);

	await PlayerSmallEvents.removeSmallEventsOfPlayer(entity.Player.id);

	await interaction.reply({
		content: respawnModule.format("respawn", {
			pseudo: escapeUsername(interaction.user.username),
			lostScore: lostScore
		})
	});

}

const currentCommandFrenchTranslations = Translations.getModule("commands.respawn", Constants.LANGUAGE.FRENCH);
const currentCommandEnglishTranslations = Translations.getModule("commands.respawn", Constants.LANGUAGE.ENGLISH);
export const commandInfo: ICommand = {
	slashCommandBuilder: SlashCommandBuilderGenerator.generateBaseCommand(currentCommandFrenchTranslations, currentCommandEnglishTranslations),
	executeCommand,
	requirements: {
		disallowEffects: [EffectsConstants.EMOJI_TEXT.BABY]
	},
	mainGuildCommand: false
};
