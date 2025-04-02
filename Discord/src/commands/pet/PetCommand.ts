import { ICommand } from "../ICommand";
import {
	makePacket, PacketContext
} from "../../../../Lib/src/packets/DraftBotPacket";
import { DraftbotInteraction } from "../../messages/DraftbotInteraction";
import i18n from "../../translations/i18n";
import { SlashCommandBuilderGenerator } from "../SlashCommandBuilderGenerator";
import {
	CommandPetPacketReq, CommandPetPacketRes
} from "../../../../Lib/src/packets/commands/CommandPetPacket";
import { SlashCommandBuilder } from "@discordjs/builders";
import { DraftBotEmbed } from "../../messages/DraftBotEmbed";
import { DiscordCache } from "../../bot/DiscordCache";
import { KeycloakUser } from "../../../../Lib/src/keycloak/KeycloakUser";
import { PacketUtils } from "../../utils/PacketUtils";
import { DisplayUtils } from "../../utils/DisplayUtils";
import { KeycloakUtils } from "../../../../Lib/src/keycloak/KeycloakUtils";
import { keycloakConfig } from "../../bot/DraftBotShard";

/**
 * Display all the information about a Pet
 */
async function getPacket(interaction: DraftbotInteraction, keycloakUser: KeycloakUser): Promise<CommandPetPacketReq | null> {
	const askedPlayer = await PacketUtils.prepareAskedPlayer(interaction, keycloakUser);
	if (!askedPlayer) {
		return null;
	}
	return makePacket(CommandPetPacketReq, { askedPlayer });
}


export async function handleCommandPetPacketRes(packet: CommandPetPacketRes, context: PacketContext): Promise<void> {
	const interaction = DiscordCache.getInteraction(context.discord!.interaction);

	let foundPlayer: KeycloakUser | null = null;
	if (packet.askedKeycloakId) {
		foundPlayer = await KeycloakUtils.getUserByKeycloakId(keycloakConfig, packet.askedKeycloakId);
	}

	await interaction?.reply({
		embeds: [
			new DraftBotEmbed()
				.formatAuthor(
					i18n.t("commands:pet.embedTitle", {
						lng: interaction.userLanguage,
						pseudo: foundPlayer?.attributes.gameUsername[0] || interaction.user.displayName
					}),
					interaction.user
				)
				.setDescription(
					DisplayUtils.getOwnedPetFieldDisplay(packet.pet, interaction.userLanguage)
				)
		]
	});
}

export const commandInfo: ICommand = {
	slashCommandBuilder: SlashCommandBuilderGenerator.generateBaseCommand("pet")
		.addUserOption(option =>
			SlashCommandBuilderGenerator.generateOption("pet", "user", option)
				.setRequired(false))
		.addIntegerOption(option =>
			SlashCommandBuilderGenerator.generateOption("pet", "rank", option)
				.setRequired(false)) as SlashCommandBuilder,
	getPacket,
	mainGuildCommand: false
};
