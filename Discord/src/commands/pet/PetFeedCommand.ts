import { ICommand } from "../ICommand";
import { SlashCommandBuilderGenerator } from "../SlashCommandBuilderGenerator";
import { DraftbotInteraction } from "../../messages/DraftbotInteraction";
import {
	makePacket, PacketContext
} from "../../../../Lib/src/packets/DraftBotPacket";
import {
	CommandPetFeedPacketReq,
	CommandPetFeedSuccessPacket
} from "../../../../Lib/src/packets/commands/CommandPetFeedPacket";
import { DiscordCache } from "../../bot/DiscordCache";
import i18n from "../../translations/i18n";
import { DraftBotEmbed } from "../../messages/DraftBotEmbed";
import {
	ReactionCollectorCreationPacket,
	ReactionCollectorRefuseReaction
} from "../../../../Lib/src/packets/interaction/ReactionCollectorPacket";
import { ReactionCollectorReturnType } from "../../packetHandlers/handlers/ReactionCollectorHandlers";
import {
	ReactionCollectorPetFeedWithGuildData,
	ReactionCollectorPetFeedWithGuildFoodReaction
} from "../../../../Lib/src/packets/interaction/ReactionCollectorPetFeedWithGuild";
import { DraftBotIcons } from "../../../../Lib/src/DraftBotIcons";
import { StringUtils } from "../../utils/StringUtils";
import { DisplayUtils } from "../../utils/DisplayUtils";
import {
	ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Message
} from "discord.js";
import { sendInteractionNotForYou } from "../../utils/ErrorUtils";
import { DiscordCollectorUtils } from "../../utils/DiscordCollectorUtils";
import { ReactionCollectorPetFeedWithoutGuildData } from "../../../../Lib/src/packets/interaction/ReactionCollectorPetFeedWithoutGuild";

async function getPacket(interaction: DraftbotInteraction): Promise<CommandPetFeedPacketReq> {
	await interaction.deferReply();
	return makePacket(CommandPetFeedPacketReq, {});
}

export async function handleCommandPetFeedSuccessPacket(packet: CommandPetFeedSuccessPacket, context: PacketContext): Promise<void> {
	const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);

	if (!interaction) {
		return;
	}

	const lng = context.discord!.language;
	const title = i18n.t("commands:petFeed.resultTitle", {
		lng, pseudo: interaction.user.displayName
	});
	const description = i18n.t(`commands:petFeed.result.${packet.result}`, { lng });

	await interaction.editReply({
		embeds: [
			new DraftBotEmbed()
				.formatAuthor(title, interaction.user)
				.setDescription(description)
		]
	});
}

export async function handleCommandPetFeedWithGuildCollector(context: PacketContext, packet: ReactionCollectorCreationPacket): Promise<ReactionCollectorReturnType> {
	const interaction = DiscordCache.getInteraction(context.discord!.interaction);

	if (!interaction) {
		return null;
	}

	const lng = context.discord!.language;
	const data = packet.data.data as ReactionCollectorPetFeedWithGuildData;
	const foodReactions = packet.reactions.map((reaction, index) => ({
		reaction, index
	})).filter(reaction => reaction.reaction.type === ReactionCollectorPetFeedWithGuildFoodReaction.name);
	const refuseIndex = packet.reactions.findIndex(reaction => reaction.type === ReactionCollectorRefuseReaction.name);

	const rowFood = new ActionRowBuilder<ButtonBuilder>();
	let foodsList = "";

	for (const foodReaction of foodReactions) {
		const foodData = foodReaction.reaction.data as ReactionCollectorPetFeedWithGuildFoodReaction;
		foodsList += `${i18n.t("commands:petFeed.feedFoodBullet", {
			lng,
			food: StringUtils.capitalizeFirstLetter(DisplayUtils.getFoodDisplay(foodData.food, 1, lng, true)), // Singular here even if there is more than one food
			amount: foodData.amount,
			maxAmount: foodData.maxAmount
		})}\n`;
		rowFood.addComponents(new ButtonBuilder()
			.setCustomId(foodReaction.index.toString())
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(DraftBotIcons.foods[foodData.food]));
	}

	const refuseCustomId = "refuse";
	const rowRefuse = new ActionRowBuilder<ButtonBuilder>();
	rowRefuse.addComponents(new ButtonBuilder()
		.setCustomId(refuseCustomId)
		.setStyle(ButtonStyle.Secondary)
		.setLabel(i18n.t("commands:petFeed.cancelButton", { lng }))
		.setEmoji(DraftBotIcons.collectors.refuse));

	const embed = new DraftBotEmbed()
		.formatAuthor(i18n.t("commands:petFeed.feedTitle", {
			lng, pseudo: interaction.user.displayName
		}), interaction.user)
		.setDescription(`${i18n.t("commands:petFeed.feedDescription", {
			lng,
			pet: DisplayUtils.getOwnedPetInlineDisplay(data.pet, lng)
		})}\n\n${foodsList}`);

	const msg = await interaction?.editReply({
		embeds: [embed],
		components: [rowFood, rowRefuse]
	}) as Message;

	const msgCollector = msg.createMessageComponentCollector({
		time: packet.endTime - Date.now()
	});

	msgCollector.on("collect", async (buttonInteraction: ButtonInteraction) => {
		if (buttonInteraction.user.id !== context.discord?.user) {
			await sendInteractionNotForYou(buttonInteraction.user, buttonInteraction, interaction.userLanguage);
			return;
		}

		await buttonInteraction.deferReply();

		if (buttonInteraction.customId === refuseCustomId) {
			DiscordCollectorUtils.sendReaction(
				packet,
				context,
				context.keycloakId!,
				buttonInteraction,
				refuseIndex
			);
			return;
		}

		DiscordCollectorUtils.sendReaction(
			packet,
			context,
			context.keycloakId!,
			buttonInteraction,
			parseInt(buttonInteraction.customId, 10)
		);
	});

	msgCollector.on("end", async () => {
		await msg.edit({
			components: []
		});
	});

	return [msgCollector];
}

export async function handleCommandPetFeedWithoutGuildCollector(context: PacketContext, packet: ReactionCollectorCreationPacket): Promise<ReactionCollectorReturnType> {
	const interaction = DiscordCache.getInteraction(context.discord!.interaction);

	if (!interaction) {
		return null;
	}

	const lng = context.discord!.language;
	const data = packet.data.data as ReactionCollectorPetFeedWithoutGuildData;

	const embed = new DraftBotEmbed().formatAuthor(i18n.t("commands:petFeed.feedTitle", {
		lng: interaction.userLanguage,
		pseudo: interaction.user.displayName
	}), interaction.user)
		.setDescription(
			i18n.t("commands:petFeed.feedWithoutGuildDesc", {
				lng: interaction.userLanguage,
				pet: DisplayUtils.getOwnedPetInlineDisplay(data.pet, interaction.userLanguage),
				food: StringUtils.capitalizeFirstLetter(DisplayUtils.getFoodDisplay(data.food, 1, lng, true)),
				price: data.price
			})
		);

	return await DiscordCollectorUtils.createAcceptRefuseCollector(interaction, embed, packet, context);
}

export const commandInfo: ICommand = {
	slashCommandBuilder: SlashCommandBuilderGenerator.generateBaseCommand("petFeed"),
	getPacket,
	mainGuildCommand: false
};
