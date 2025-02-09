import {packetHandler} from "../PacketHandler";
import {PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import {
	CommandFightIntroduceFightersPacket,
	CommandFightOpponentsNotFoundPacket,
	CommandFightRefusePacketRes, CommandFightStatusPacket
} from "../../../../Lib/src/packets/commands/CommandFightPacket";
import {
	handleCommandFightIntroduceFightersRes,
	handleCommandFightRefusePacketRes, handleCommandFightUpdateStatusRes
} from "../../commands/player/FightCommand";
import {handleClassicError} from "../../utils/ErrorUtils";

export default class FightHandler {
	@packetHandler(CommandFightRefusePacketRes)
	async refuseFight(context: PacketContext, _packet: CommandFightRefusePacketRes): Promise<void> {
		await handleCommandFightRefusePacketRes(context);
	}

	@packetHandler(CommandFightOpponentsNotFoundPacket)
	async opponentsNotFoundFight(context: PacketContext, _packet: CommandFightOpponentsNotFoundPacket): Promise<void> {
		await handleClassicError(context, "commands:fight.opponentsNotFound");
	}

	@packetHandler(CommandFightIntroduceFightersPacket)
	async introduceFighters(context: PacketContext, packet: CommandFightIntroduceFightersPacket): Promise<void> {
		await handleCommandFightIntroduceFightersRes(packet, context);
	}

	@packetHandler(CommandFightStatusPacket)
	async updateFightStatus(context: PacketContext, packet: CommandFightStatusPacket): Promise<void> {
		await handleCommandFightUpdateStatusRes(packet, context);
	}

}