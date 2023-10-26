import {Fighter} from "../../../fighter/Fighter";
import {FightActionController} from "../../FightActionController";
import {attackInfo, statsInfo} from "../../FightAction";
import {RandomUtils} from "@Core/src/core/utils/RandomUtils";
import {FightActionFunc} from "@Core/src/data/FightAction";
import {FightStatBuffed} from "@Lib/src/interfaces/FightActionResult";
import {FightStatModifierOperation} from "@Lib/src/interfaces/FightStatModifierOperation";
import {simpleDamageFightAction} from "@Core/src/core/fights/actions/templates/SimpleDamageFightActionTemplate";

const use: FightActionFunc = (_fight, fightAction, sender, receiver, _turn) => {
	const result = simpleDamageFightAction(
		{sender, receiver},
		{critical: 40, failure: 15},
		{attackInfo: getAttackInfo(), statsInfo: getStatsInfo(sender, receiver)}
	);

	if (RandomUtils.draftbotRandom.bool(0.65)) {
		FightActionController.applyBuff(result, {
			selfTarget: false,
			stat: FightStatBuffed.ATTACK,
			operator: FightStatModifierOperation.MULTIPLIER,
			value: 0.85
		}, receiver, fightAction);
	}

	return result;
};

export default use;

function getAttackInfo(): attackInfo {
	return {
		minDamage: 40,
		averageDamage: 75,
		maxDamage: 155
	};
}

function getStatsInfo(sender: Fighter, receiver: Fighter): statsInfo {
	return {
		attackerStats: [
			sender.getAttack(),
			receiver.getAttack()
		],
		defenderStats: [
			0,
			0
		],
		statsEffect: [
			0.5,
			0.5
		]
	};
}