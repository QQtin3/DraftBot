import {packetHandler} from "../PacketHandler";
import {PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import {
	CommandFightOpponentsNotFoundPacket,
	CommandFightRefusePacketRes
} from "../../../../Lib/src/packets/commands/CommandFightPacket";
import {
	handleCommandFightAIFightActionChoose,
	handleCommandFightHistoryItemRes,
	handleCommandFightIntroduceFightersRes,
	handleCommandFightRefusePacketRes,
	handleCommandFightUpdateStatusRes
} from "../../commands/player/FightCommand";
import {handleClassicError} from "../../utils/ErrorUtils";
import {CommandFightIntroduceFightersPacket} from "../../../../Lib/src/packets/fights/FightIntroductionPacket";
import {CommandFightStatusPacket} from "../../../../Lib/src/packets/fights/FightStatusPacket";
import {CommandFightHistoryItemPacket} from "../../../../Lib/src/packets/fights/FightHistoryItemPacket";
import {AIFightActionChoosePacket} from "../../../../Lib/src/packets/fights/AIFightActionChoosePacket";

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
		await handleCommandFightIntroduceFightersRes(context, packet);
	}

	@packetHandler(CommandFightStatusPacket)
	async updateFightStatus(context: PacketContext, packet: CommandFightStatusPacket): Promise<void> {
		await handleCommandFightUpdateStatusRes(context, packet);
	}

	@packetHandler(CommandFightHistoryItemPacket)
	async addHistoryItem(context: PacketContext, packet: CommandFightHistoryItemPacket): Promise<void> {
		await handleCommandFightHistoryItemRes(context, packet);
	}

	@packetHandler(AIFightActionChoosePacket)
	async aiFightActionChoose(context: PacketContext, _packet: AIFightActionChoosePacket): Promise<void> {
		await handleCommandFightAIFightActionChoose(context);
	}
}