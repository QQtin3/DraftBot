import {DraftBotPacket, makePacket, PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import {Player, Players} from "../../core/database/game/models/Player";
import {
	CommandUnlockAcceptPacketRes,
	CommandUnlockHimself,
	CommandUnlockNoPlayerFound,
	CommandUnlockNotEnoughMoney,
	CommandUnlockNotInJail,
	CommandUnlockPacketReq,
	CommandUnlockRefusePacketRes
} from "../../../../Lib/src/packets/commands/CommandUnlockPacket";
import {EndCallback, ReactionCollectorInstance} from "../../core/utils/ReactionsCollector";
import {ReactionCollectorAcceptReaction} from "../../../../Lib/src/packets/interaction/ReactionCollectorPacket";
import {BlockingConstants} from "../../../../Lib/src/constants/BlockingConstants";
import {BlockingUtils} from "../../core/utils/BlockingUtils";
import {commandRequires, CommandUtils} from "../../core/utils/CommandUtils";
import {ReactionCollectorUnlock} from "../../../../Lib/src/packets/interaction/ReactionCollectorUnlock";
import {draftBotInstance} from "../../index";
import {UnlockConstants} from "../../../../Lib/src/constants/UnlockConstants";
import {TravelTime} from "../../core/maps/TravelTime";
import {NumberChangeReason} from "../../../../Lib/src/constants/LogsConstants";
import {Effect} from "../../../../Lib/src/types/Effect";
import {WhereAllowed} from "../../../../Lib/src/types/WhereAllowed";

/**
 * Accept the unlock of a player
 * @param player
 * @param freedPlayer
 * @param response
 */
async function acceptUnlock(player: Player, freedPlayer: Player, response: DraftBotPacket[]): Promise<void> {
	await player.reload();
	// Do all necessary checks again just in case something changed during the menu
	if (unlockCannotBeDone(player, freedPlayer, response)) {
		return;
	}

	await TravelTime.removeEffect(freedPlayer, NumberChangeReason.UNLOCK);
	await player.spendMoney({
		amount: UnlockConstants.PRICE_FOR_UNLOCK,
		response,
		reason: NumberChangeReason.UNLOCK
	});

	await Promise.all([
		player.save(),
		freedPlayer.save()
	]);

	draftBotInstance.logsDatabase.logUnlock(player.keycloakId, freedPlayer.keycloakId).then();

	response.push(makePacket(CommandUnlockAcceptPacketRes, {
		unlockedKeycloakId: freedPlayer.keycloakId
	}));
}

/**
 * Check if the player can unlock another player
 * @param player The player who wants to kick a member
 * @param freedPlayer The player who will be freed from the prison
 * @param response The response to send
 */
function unlockCannotBeDone(player: Player, freedPlayer: Player, response: DraftBotPacket[]): boolean {
	if (freedPlayer === null) {
		response.push(makePacket(CommandUnlockNoPlayerFound, {}));
		return true;
	}
	if (player.money < UnlockConstants.PRICE_FOR_UNLOCK) {
		response.push(makePacket(CommandUnlockNotEnoughMoney, {
			money: player.money
		}));
		return true;
	}
	if (player.id === freedPlayer.id) {
		response.push(makePacket(CommandUnlockHimself, {}));
		return true;
	}
	if (freedPlayer.effectId !== Effect.JAILED.id) {
		response.push(makePacket(CommandUnlockNotInJail, {}));
		return true;
	}
	return false;
}

export default class UnlockCommand {
	@commandRequires(CommandUnlockPacketReq, {
		notBlocked: true,
		allowedEffects: CommandUtils.ALLOWED_EFFECTS.NO_EFFECT,
		whereAllowed: [WhereAllowed.CONTINENT]
	})
	async execute(response: DraftBotPacket[], player: Player, packet: CommandUnlockPacketReq, context: PacketContext): Promise<void> {
		const freedPlayer = await Players.getAskedPlayer(packet.askedPlayer, player);

		if (unlockCannotBeDone(player, freedPlayer, response)) {
			return;
		}

		// Send collector
		const collector = new ReactionCollectorUnlock(
			freedPlayer.keycloakId
		);

		const endCallback: EndCallback = async (collector: ReactionCollectorInstance, response: DraftBotPacket[]): Promise<void> => {
			const reaction = collector.getFirstReaction();
			if (reaction && reaction.reaction.type === ReactionCollectorAcceptReaction.name) {
				await acceptUnlock(player, freedPlayer, response);
			}
			else {
				response.push(makePacket(CommandUnlockRefusePacketRes, {}));
			}
			BlockingUtils.unblockPlayer(player.id, BlockingConstants.REASONS.UNLOCK);
		};

		const collectorPacket = new ReactionCollectorInstance(
			collector,
			context,
			{
				allowedPlayerKeycloakIds: [player.keycloakId],
				reactionLimit: 1
			},
			endCallback
		)
			.block(player.id, BlockingConstants.REASONS.UNLOCK)
			.build();

		response.push(collectorPacket);
	}
}