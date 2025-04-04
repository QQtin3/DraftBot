import { ReactionCollectorCreationPacket } from "../../../Lib/src/packets/interaction/ReactionCollectorPacket";
import { PacketContext } from "../../../Lib/src/packets/DraftBotPacket";
import { DiscordCache } from "../bot/DiscordCache";
import { DraftbotSmallEventEmbed } from "../messages/DraftbotSmallEventEmbed";
import { StringUtils } from "../utils/StringUtils";
import { DiscordCollectorUtils } from "../utils/DiscordCollectorUtils";
import { DisplayUtils } from "../utils/DisplayUtils";
import { Constants } from "../../../Lib/src/constants/Constants";
import i18n from "../translations/i18n";
import { ReactionCollectorEpicShopSmallEventData } from "../../../Lib/src/packets/interaction/ReactionCollectorEpicShopSmallEvent";
import { ReactionCollectorReturnType } from "../packetHandlers/handlers/ReactionCollectorHandlers";
import {DraftBotIcons} from "../../../Lib/src/DraftBotIcons";

/**
 * Send the initial embed for this small event
 * @param packet
 * @param context
 */
export async function epicItemShopCollector(context: PacketContext, packet: ReactionCollectorCreationPacket): Promise<ReactionCollectorReturnType> {
	const interaction = DiscordCache.getInteraction(context.discord!.interaction)!;
	if (!interaction) {
		return null;
	}
	const lng = interaction.userLanguage;
	const data = packet.data.data as ReactionCollectorEpicShopSmallEventData;
	const tip = data.tip ? i18n.t("smallEvents:epicItemShop.reductionTip", { lng }) : "";

	const embed = new DraftbotSmallEventEmbed(
		"epicItemShop",
		StringUtils.getRandomTranslation("smallEvents:epicItemShop.intro", lng)
		+ tip
		+ StringUtils.getRandomTranslation("smallEvents:shop.end", lng, {
			item: DisplayUtils.getItemDisplayWithStats(data.item, lng),
			price: data.price,
			type: `${DraftBotIcons.ItemCategories[data.item.category]}${i18n.t("smallEvents:shop.types", {
				returnObjects: true,
				lng
			})[data.item.category]}`,
			interpolation: { escapeValue: false }
		}),
		interaction.user,
		lng
	);

	return await DiscordCollectorUtils.createAcceptRefuseCollector(interaction, embed, packet, context);
}

export async function epicItemShopHandler(context: PacketContext, translationKey: string): Promise<void> {
	const originalInteraction = DiscordCache.getInteraction(context.discord!.interaction!);
	if (!originalInteraction) {
		return;
	}
	const buttonInteraction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);
	await buttonInteraction?.editReply({
		embeds: [
			new DraftbotSmallEventEmbed(
				"epicItemShop",
				StringUtils.getRandomTranslation(translationKey, originalInteraction.userLanguage),
				buttonInteraction.user,
				originalInteraction.userLanguage
			)
		]
	});
}
