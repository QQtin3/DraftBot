import {ReactionCollectorCreationPacket} from "../../../Lib/src/packets/interaction/ReactionCollectorPacket";
import {PacketContext} from "../../../Lib/src/packets/DraftBotPacket";
import {DiscordCache} from "../bot/DiscordCache";
import {DraftbotSmallEventEmbed} from "../messages/DraftbotSmallEventEmbed";
import {StringUtils} from "../utils/StringUtils";
import {DraftBotIcons} from "../../../Lib/src/DraftBotIcons";
import i18n from "../translations/i18n";
import {getRandomSmallEventIntro} from "../packetHandlers/handlers/SmallEventsHandler";
import {
	ReactionCollectorFightPetData,
	ReactionCollectorFightPetReaction
} from "../../../Lib/src/packets/interaction/ReactionCollectorFightPet";
import {DraftbotInteraction} from "../messages/DraftbotInteraction";
import {DraftbotButtonReaction, DraftbotButtonReactionMessage} from "../messages/DraftbotButtonReactionMessage";
import {StringConstants} from "../../../Lib/src/constants/StringConstants";
import {ReactionCollectorReturnType} from "../packetHandlers/handlers/ReactionCollectorHandlers";

function getFightPetReactions(interaction: DraftbotInteraction, baseReactions: ReactionCollectorFightPetReaction[]): DraftbotButtonReaction[] {
	const reactions: DraftbotButtonReaction[] = [];
	for (const reaction of baseReactions) {
		reactions.push({
			customId: reaction.actionId,
			emote: DraftBotIcons.fightPetActions[reaction.actionId],
			description: i18n.t(`smallEvents:fightPet.fightPetActions.${reaction.actionId}.name`, {lng: interaction.userLanguage})
		});
	}
	return reactions;
}

export async function fightPetCollector(context: PacketContext, packet: ReactionCollectorCreationPacket): Promise<ReactionCollectorReturnType> {
	const interaction = DiscordCache.getInteraction(context.discord!.interaction)!;
	const data = packet.data.data as ReactionCollectorFightPetData;
	const lng = interaction!.userLanguage;

	const formatBaseOptions = {
		lng,
		context: data.isFemale ? StringConstants.SEX.MALE.long : StringConstants.SEX.FEMALE.long
	};

	const reactions = getFightPetReactions(interaction, packet.reactions.map(reaction => reaction.data as ReactionCollectorFightPetReaction));

	const embed = new DraftbotSmallEventEmbed(
		"fightPet",
		`${getRandomSmallEventIntro(lng)}${
			StringUtils.getRandomTranslation("smallEvents:fightPet.intro", lng, {
				...formatBaseOptions,
				feralPet: i18n.t("smallEvents:fightPet.customPetDisplay", {
					...formatBaseOptions,
					petId: data.petId,
					petName: i18n.t(`models:pets.${data.petId}`, formatBaseOptions),
					adjective: StringUtils.getRandomTranslation("smallEvents:fightPet.adjectives", lng, formatBaseOptions)
				})
			})} ${StringUtils.getRandomTranslation("smallEvents:fightPet.situation", lng)}`,
		interaction.user,
		lng
	);

	return await new DraftbotButtonReactionMessage(interaction, {
		reactions,
		embed,
		packet,
		context,
		canEndReact: true
	}).send();
}