import {packetHandler} from "../../../PacketHandler";
import {PacketContext} from "../../../../../../Lib/src/packets/DraftBotPacket";
import {handleClassicError} from "../../../../utils/ErrorUtils";
import {
	CommandPetTransferAnotherMemberTransferringErrorPacket,
	CommandPetTransferCancelErrorPacket, CommandPetTransferFeistyErrorPacket,
	CommandPetTransferNoPetErrorPacket,
	CommandPetTransferSituationChangedErrorPacket,
	CommandPetTransferSuccessPacket
} from "../../../../../../Lib/src/packets/commands/CommandPetTransferPacket";
import {KeycloakUtils} from "../../../../../../Lib/src/keycloak/KeycloakUtils";
import {keycloakConfig} from "../../../../bot/DraftBotShard";
import {handlePetTransferSuccess} from "../../../../commands/pet/PetTransferCommand";

export default class PetTransferCommandPacketHandlers {
	@packetHandler(CommandPetTransferAnotherMemberTransferringErrorPacket)
	async anotherPlayerTransferring(context: PacketContext, packet: CommandPetTransferAnotherMemberTransferringErrorPacket): Promise<void> {
		await handleClassicError(context, "commands:petTransfer.anotherPlayerTransferring", {
			playerName: (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, packet.keycloakId))?.attributes.gameUsername[0],
			lng: context.discord!.language
		});
	}

	@packetHandler(CommandPetTransferCancelErrorPacket)
	async cancelError(context: PacketContext, _packet: CommandPetTransferCancelErrorPacket): Promise<void> {
		await handleClassicError(context, "commands:petTransfer.transferCancelled");
	}

	@packetHandler(CommandPetTransferSituationChangedErrorPacket)
	async situationChanged(context: PacketContext, _packet: CommandPetTransferSituationChangedErrorPacket): Promise<void> {
		await handleClassicError(context, "commands:petTransfer.situationChanged");
	}

	@packetHandler(CommandPetTransferNoPetErrorPacket)
	async noPetError(context: PacketContext, _packet: CommandPetTransferNoPetErrorPacket): Promise<void> {
		await handleClassicError(context, "commands:petTransfer.noPet");
	}

	@packetHandler(CommandPetTransferSuccessPacket)
	async transferSuccess(context: PacketContext, packet: CommandPetTransferSuccessPacket): Promise<void> {
		await handlePetTransferSuccess(context, packet);
	}

	@packetHandler(CommandPetTransferFeistyErrorPacket)
	async feistyError(context: PacketContext, _packet: CommandPetTransferFeistyErrorPacket): Promise<void> {
		await handleClassicError(context, "commands:petTransfer.feistyError");
	}
}