import { SmallEventFuncs } from "../../data/SmallEvent";
import { Maps } from "../maps/Maps";
import {
	EndCallback, ReactionCollectorInstance
} from "../utils/ReactionsCollector";
import {
	DraftBotPacket, makePacket, PacketContext
} from "../../../../Lib/src/packets/DraftBotPacket";
import {
	WitchAction, WitchActionDataController
} from "../../data/WitchAction";
import { SmallEventConstants } from "../../../../Lib/src/constants/SmallEventConstants";
import { BlockingUtils } from "../utils/BlockingUtils";
import { BlockingConstants } from "../../../../Lib/src/constants/BlockingConstants";
import { RandomUtils } from "../../../../Lib/src/utils/RandomUtils";
import { SmallEventWitchResultPacket } from "../../../../Lib/src/packets/smallEvents/SmallEventWitchPacket";
import {
	generateRandomItem, giveItemToPlayer
} from "../utils/ItemUtils";
import {
	ItemCategory, ItemNature, ItemRarity
} from "../../../../Lib/src/constants/ItemConstants";
import Player from "../database/game/models/Player";
import { GenericItem } from "../../data/GenericItem";
import { InventorySlots } from "../database/game/models/InventorySlot";
import {
	ReactionCollectorWitch, ReactionCollectorWitchReaction
} from "../../../../Lib/src/packets/interaction/ReactionCollectorWitch";
import { NumberChangeReason } from "../../../../Lib/src/constants/LogsConstants";
import { WitchActionOutcomeType } from "../../../../Lib/src/types/WitchActionOutcomeType";
import { Effect } from "../../../../Lib/src/types/Effect";
import { ClassConstants } from "../../../../Lib/src/constants/ClassConstants";


type WitchEventSelection = {
	randomAdvice: WitchAction;
	randomIngredient: WitchAction;
	fullRandom: WitchAction;
	optional?: WitchAction;
};

/**
 * Returns an object composed of three random witch events
 * @param isMage true if the player is a mage
 */
function getRandomWitchEvents(isMage: boolean): WitchEventSelection {
	const randomAdvice = WitchActionDataController.instance.getRandomWitchEventByType(false);
	const randomIngredient = WitchActionDataController.instance.getRandomWitchEventByType(true);
	const fullRandom = WitchActionDataController.instance.getRandomWitchAction([randomAdvice, randomIngredient]);
	if (isMage) {
		// A mage can get an additional random event
		const optional = WitchActionDataController.instance.getRandomWitchAction(
			[
				randomAdvice,
				randomIngredient,
				fullRandom,
				WitchActionDataController.instance.getDoNothing()
			]
		);
		return {
			randomAdvice, randomIngredient, optional, fullRandom
		};
	}
	return {
		randomAdvice, randomIngredient, fullRandom
	};
}


/**
 * Give a specific potion to a player
 * @param context
 * @param player
 * @param potionToGive
 * @param response
 */
async function givePotion(context: PacketContext, player: Player, potionToGive: GenericItem, response: DraftBotPacket[]): Promise<void> {
	await giveItemToPlayer(
		player,
		potionToGive,
		context,
		response,
		await InventorySlots.getOfPlayer(player.id)
	);
}

/**
 * Execute the relevant action for the selected event and outcome
 * @param outcome
 * @param selectedEvent
 * @param context
 * @param player
 * @param response
 */
async function applyOutcome(outcome: WitchActionOutcomeType, selectedEvent: WitchAction, context: PacketContext, player: Player, response: DraftBotPacket[]): Promise<void> {
	if (selectedEvent.forceEffect || outcome === WitchActionOutcomeType.EFFECT) {
		await selectedEvent.giveEffect(player);
	}
	else if (outcome === WitchActionOutcomeType.LIFE_LOSS) {
		await player.addHealth(
			-SmallEventConstants.WITCH.BASE_LIFE_POINTS_REMOVED_AMOUNT,
			response,
			NumberChangeReason.SMALL_EVENT
		);
	}
	else if (outcome === WitchActionOutcomeType.POTION) {
		const potionToGive = selectedEvent.generatePotionWitchAction() ?? {
			minRarity: ItemRarity.COMMON,
			maxRarity: ItemRarity.MYTHICAL,
			nature: null
		};
		await givePotion(
			context,
			player,
			generateRandomItem(
				ItemCategory.POTION,
				potionToGive.minRarity,
				potionToGive.maxRarity,
				potionToGive.nature
			),
			response
		);
	}
	await player.save();
}

function getEndCallback(player: Player): EndCallback {
	return async (collector, response) => {
		const reaction = collector.getFirstReaction();
		const selectedEvent = reaction
			? WitchActionDataController.instance.getById((reaction.reaction.data as ReactionCollectorWitchReaction).id)
			: WitchActionDataController.instance.getDoNothing();
		const outcome = selectedEvent.generateOutcome();
		BlockingUtils.unblockPlayer(player.keycloakId, BlockingConstants.REASONS.WITCH_CHOOSE);

		const resultPacket = makePacket(SmallEventWitchResultPacket, {
			outcome,
			ingredientId: selectedEvent.id,
			isIngredient: selectedEvent.isIngredient,
			effectId: selectedEvent.effectType ?? Effect.OCCUPIED.id,
			timeLost: selectedEvent.timePenalty,
			lifeLoss: SmallEventConstants.WITCH.BASE_LIFE_POINTS_REMOVED_AMOUNT,
			forceEffect: selectedEvent.forceEffect ?? false
		});

		// There is a chance that the player will get a no effect potion, no matter what he chose
		if (RandomUtils.draftbotRandom.bool(SmallEventConstants.WITCH.NO_EFFECT_CHANCE)) {
			if (selectedEvent.forceEffect) {
				await selectedEvent.giveEffect(player);
			}
			resultPacket.outcome = WitchActionOutcomeType.POTION;
			response.push(resultPacket);
			const potionToGive = generateRandomItem(
				ItemCategory.POTION,
				ItemRarity.COMMON,
				ItemRarity.MYTHICAL,
				ItemNature.NONE
			);
			await givePotion(collector.context, player, potionToGive, response);
			return;
		}

		response.push(resultPacket);

		await applyOutcome(outcome, selectedEvent, collector.context, player, response);

		await player.killIfNeeded(response, NumberChangeReason.SMALL_EVENT);

		await selectedEvent.checkMissionsWitchAction(player, outcome, response);
	};
}

export const smallEventFuncs: SmallEventFuncs = {
	canBeExecuted: Maps.isOnContinent,

	executeSmallEvent: (response, player, context) => {
		const events = getRandomWitchEvents(player.class === ClassConstants.CLASSES_ID.MYSTIC_MAGE);

		const collector = new ReactionCollectorWitch(
			Object.values(events).map(event => ({ id: event.id }))
		);

		const packet = new ReactionCollectorInstance(
			collector,
			context,
			{
				allowedPlayerKeycloakIds: [player.keycloakId]
			},
			getEndCallback(player)
		)
			.block(player.keycloakId, BlockingConstants.REASONS.WITCH_CHOOSE)
			.build();

		response.push(packet);
	}
};
