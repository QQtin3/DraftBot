import {makePacket, PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import {ICommand} from "../ICommand";
import {SlashCommandBuilderGenerator} from "../SlashCommandBuilderGenerator";
import {DiscordCache} from "../../bot/DiscordCache";
import i18n from "../../translations/i18n";
import {DraftBotEmbed} from "../../messages/DraftBotEmbed";
import {DraftbotInteraction} from "../../messages/DraftbotInteraction";
import {
	CommandSellItemSuccessPacket,
	CommandSellPacketReq
} from "../../../../Lib/src/packets/commands/CommandSellPacket";
import {ItemCategory} from "../../../../Lib/src/constants/ItemConstants";
import {DisplayUtils} from "../../utils/DisplayUtils";
import {
	ReactionCollectorCreationPacket,
	ReactionCollectorRefuseReaction
} from "../../../../Lib/src/packets/interaction/ReactionCollectorPacket";
import {ReactionCollectorReturnType} from "../../packetHandlers/handlers/ReactionCollectorHandlers";
import {ReactionCollectorSellItemReaction} from "../../../../Lib/src/packets/interaction/ReactionCollectorSell";
import {DraftBotIcons} from "../../../../Lib/src/DraftBotIcons";
import {
	ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle,
	InteractionCollector,
	Message,
	parseEmoji,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder
} from "discord.js";
import {sendInteractionNotForYou} from "../../utils/ErrorUtils";
import {DiscordCollectorUtils} from "../../utils/DiscordCollectorUtils";
import {PacketUtils} from "../../utils/PacketUtils";
import {ReactionCollectorResetTimerPacketReq} from "../../../../Lib/src/packets/interaction/ReactionCollectorResetTimer";

/**
 * Get the packet
 */
async function getPacket(interaction: DraftbotInteraction): Promise<CommandSellPacketReq> {
	await interaction.deferReply();
	return makePacket(CommandSellPacketReq, {});
}

export async function handleCommandSellSuccessPacket(packet: CommandSellItemSuccessPacket, context: PacketContext): Promise<void> {
	const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);

	if (!interaction) {
		return;
	}

	const lng = context.discord!.language;
	const title = i18n.t("commands:sell.soldMessageTitle", { lng, pseudo: interaction.user.displayName });
	const description = i18n.t(
		packet.item.category === ItemCategory.POTION && packet.price === 0
			? "commands:sell.potionDestroyedMessage"
			: "commands:sell.soldMessage",
		{ lng, item: DisplayUtils.getItemDisplay(packet.item, lng) }
	);

	await interaction.editReply({
		embeds: [new DraftBotEmbed()
			.formatAuthor(title, interaction.user)
			.setDescription(description)]
	});
}

async function validateSell(
	packet: ReactionCollectorCreationPacket,
	context: PacketContext,
	interaction: DraftbotInteraction | StringSelectMenuInteraction,
	reactionsInfo: { reaction: ReactionCollectorSellItemReaction, reactionIndex: number, refuseReactionIndex: number }
): Promise<ReactionCollectorReturnType> {
	const lng = context.discord!.language;
	const validateClassChangeEmbed = new DraftBotEmbed()
		.formatAuthor(i18n.t("commands:sell.sellTitle", { lng, pseudo: interaction.user.displayName }), interaction.user)
		.setDescription(i18n.t(reactionsInfo.reaction.item.category === ItemCategory.POTION && reactionsInfo.reaction.price === 0 ? "commands:sell.throwAwayField" : "commands:sell.confirmSell", {
			lng,
			item: DisplayUtils.getItemDisplay(reactionsInfo.reaction.item, lng),
			price: reactionsInfo.reaction.price,
			interpolation: { escapeValue: false }
		}));

	const refuseCustomId = "refuse";
	const acceptCustomId = "validate";

	const validateRow = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(new ButtonBuilder()
			.setEmoji(parseEmoji(DraftBotIcons.collectors.accept)!)
			.setCustomId(acceptCustomId)
			.setStyle(ButtonStyle.Secondary))
		.addComponents(new ButtonBuilder()
			.setEmoji(parseEmoji(DraftBotIcons.collectors.refuse)!)
			.setCustomId(refuseCustomId)
			.setStyle(ButtonStyle.Secondary));

	const validateMsg = await interaction.editReply({
		embeds: [validateClassChangeEmbed],
		components: [validateRow]
	}) as Message;

	const validateCollector = validateMsg.createMessageComponentCollector();

	validateCollector.on("collect", async (validateInteraction: ButtonInteraction) => {
		if (validateInteraction.user.id !== context.discord?.user) {
			await sendInteractionNotForYou(validateInteraction.user, validateInteraction, lng);
			return;
		}

		await validateInteraction.deferReply();

		if (validateInteraction.customId === refuseCustomId) {
			DiscordCollectorUtils.sendReaction(
				packet,
				context,
				context.keycloakId!,
				validateInteraction,
				reactionsInfo.refuseReactionIndex
			);
			return;
		}

		DiscordCollectorUtils.sendReaction(
			packet,
			context,
			context.keycloakId!,
			validateInteraction,
			reactionsInfo.reactionIndex
		);
	});

	return [validateCollector];
}

export async function handleSellReactionCollector(context: PacketContext, packet: ReactionCollectorCreationPacket): Promise<ReactionCollectorReturnType> {
	const interaction = DiscordCache.getInteraction(context.discord!.interaction);

	if (!interaction) {
		return null;
	}

	const lng = context.discord!.language;
	const itemsReactions = packet.reactions.filter(reaction => reaction.type === ReactionCollectorSellItemReaction.name).map(reaction => reaction.data) as ReactionCollectorSellItemReaction[];
	const refuseReactionIndex = packet.reactions.findIndex(reaction => reaction.type === ReactionCollectorRefuseReaction.name);

	if (itemsReactions.length === 1) {
		return await validateSell(
			packet,
			context,
			interaction,
			{ reaction: itemsReactions[0], reactionIndex: packet.reactions.findIndex((reaction) => reaction.type === ReactionCollectorSellItemReaction.name), refuseReactionIndex }
		);
	}

	const mainEmbed = new DraftBotEmbed()
		.setTitle(i18n.t("commands:sell.titleChoiceEmbed", { lng }))
		.setDescription(i18n.t("commands:sell.sellIndication", { lng }) + "\n\n" + itemsReactions.map((reaction) =>
			i18n.t(reaction.item.category === ItemCategory.POTION && reaction.price === 0 ? "commands:sell.throwAwayField" : "commands:sell.sellField", {
				lng,
				name: DisplayUtils.getItemDisplay(reaction.item, lng),
				value: reaction.price,
				interpolation: { escapeValue: false }
			})) + "\n");

	const refuseCustomId = "refuse";

	const mainEmbedRow = new ActionRowBuilder<StringSelectMenuBuilder>();
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId("sellSelectionMenu")
		.setPlaceholder(i18n.t("commands:sell.menuPlaceholder", { lng }));
	for (let i = 0; i < itemsReactions.length; i++) {
		const reaction = itemsReactions[i];
		selectMenu.addOptions(new StringSelectMenuOptionBuilder()
			.setLabel(DisplayUtils.getSimpleItemName(reaction.item, lng))
			.setValue(i.toString())
			.setEmoji(parseEmoji(DisplayUtils.getItemIcon(reaction.item))!));
	}

	selectMenu.addOptions(new StringSelectMenuOptionBuilder()
		.setLabel(i18n.t("commands:sell.cancel", { lng }))
		.setValue(refuseCustomId)
		.setEmoji(parseEmoji(DraftBotIcons.collectors.refuse)!));

	mainEmbedRow.addComponents(selectMenu);

	const msg = await interaction?.editReply({
		embeds: [mainEmbed],
		components: [mainEmbedRow]
	}) as Message;

	let validateCollector: InteractionCollector<never>;

	const selectCollector = msg.createMessageComponentCollector({
		time: packet.endTime - Date.now()
	});

	selectCollector.on("collect", async (selectMenuInteraction: StringSelectMenuInteraction) => {
		if (selectMenuInteraction.user.id !== context.discord?.user) {
			await sendInteractionNotForYou(selectMenuInteraction.user, selectMenuInteraction, interaction.userLanguage);
			return;
		}

		await selectMenuInteraction.deferReply();

		const selectedOption = selectMenuInteraction.values[0];

		if (selectedOption === refuseCustomId) {
			DiscordCollectorUtils.sendReaction(
				packet,
				context,
				context.keycloakId!,
				selectMenuInteraction,
				packet.reactions.findIndex((reaction) => reaction.type === ReactionCollectorRefuseReaction.name)
			);
			return;
		}

		// Reset the collector timer, so it doesn't end while the user is still choosing either to validate or refuse
		PacketUtils.sendPacketToBackend(context, makePacket(ReactionCollectorResetTimerPacketReq, {reactionCollectorId: packet.id}));

		const reaction = itemsReactions[parseInt(selectedOption, 10)];

		validateCollector = (
			await validateSell(
				packet,
				context,
				selectMenuInteraction,
				{ reaction, reactionIndex: packet.reactions.findIndex((reaction) => reaction.data === reaction), refuseReactionIndex }
			))![0] as unknown as InteractionCollector<never>;
	});

	selectCollector.on("end", () => {
		if (validateCollector && !validateCollector.ended) {
			validateCollector.stop();
		}
	});

	return [selectCollector];
}

export const commandInfo: ICommand = {
	slashCommandBuilder: SlashCommandBuilderGenerator.generateBaseCommand("sell"),
	getPacket,
	mainGuildCommand: false
};