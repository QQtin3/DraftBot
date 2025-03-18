import {ClassBehavior} from "../AiBehaviorManager";
import {AiPlayerFighter} from "../fighter/AiPlayerFighter";
import {FightView} from "../FightView";
import {FightAction, FightActionDataController} from "../../../data/FightAction";
import {FightConstants} from "../../../../../Lib/src/constants/FightConstants";
import {PlayerFighter} from "../fighter/PlayerFighter";
import {ClassConstants} from "../../../../../Lib/src/constants/ClassConstants";
import {RandomUtils} from "../../../../../Lib/src/utils/RandomUtils";
import {piercingOrSimpleAttack, shouldProtect} from "./RecruitFightBehavior";

class InfantryManFightBehavior implements ClassBehavior {

	private powerfulAttacksUsedMap = 0;

	chooseAction(me: AiPlayerFighter, fightView: FightView): FightAction {

		const powerfulAttacksUsed = this.powerfulAttacksUsedMap;
		const opponent = fightView.fightController.getDefendingFighter() as PlayerFighter | AiPlayerFighter; // AI will never fight monsters

		if (shouldProtect(opponent, me)) {
			return FightActionDataController.instance.getById(FightConstants.FIGHT_ACTIONS.PLAYER.PROTECTION);
		}

		// Priority is to use powerful attacks
		if (
			powerfulAttacksUsed <= 2
			&& RandomUtils.draftbotRandom.bool(0.9) // Add a bit of randomness here to avoid being too predictable
			&& me.getBreath() >= FightActionDataController.getFightActionBreathCost(FightConstants.FIGHT_ACTIONS.PLAYER.POWERFUL_ATTACK)
		) {
			this.powerfulAttacksUsedMap++;
			return FightActionDataController.instance.getById(FightConstants.FIGHT_ACTIONS.PLAYER.POWERFUL_ATTACK);
		}

		// Use charging attack if the opponent is not a knight and we have enough breath
		if (
			(fightView.fightController.turn > 11 // Except if we are a late fight
				|| powerfulAttacksUsed > 2) // Priority to the powerful attacks
			&& me.getEnergy() > me.getMaxEnergy() * 0.21 // Don't use it if we are about to die
			&& (opponent.player.class !== ClassConstants.CLASSES_ID.MYSTIC_MAGE
				|| me.hasFightAlteration()
			)
			&& (RandomUtils.draftbotRandom.bool() || opponent.getDefense() < me.getDefense()) // If opponent has more defense we don't want to spam this attack
			&& opponent.player.class !== ClassConstants.CLASSES_ID.KNIGHT
			&& me.getBreath() >= FightActionDataController.getFightActionBreathCost(FightConstants.FIGHT_ACTIONS.PLAYER.CHARGE_CHARGING_ATTACK)
		) {
			return FightActionDataController.instance.getById(FightConstants.FIGHT_ACTIONS.PLAYER.CHARGE_CHARGING_ATTACK);
		}

		return piercingOrSimpleAttack(opponent, me);
	}
}

export default InfantryManFightBehavior;