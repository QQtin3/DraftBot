import {FightActionFunc} from "@Core/src/data/FightAction";
import {attackInfo, statsInfo} from "@Core/src/core/fights/actions/FightAction";
import {Fighter} from "@Core/src/core/fights/fighter/Fighter";
import {simpleDamageFightAction} from "@Core/src/core/fights/actions/templates/SimpleDamageFightActionTemplate";

const use: FightActionFunc = (_fight, _fightAction, sender, receiver) => {
	return simpleDamageFightAction(
		{sender, receiver},
		{critical: 5, failure: 10},
		{attackInfo: getAttackInfo(), statsInfo: getStatsInfo(sender, receiver)}
	);
};

function getAttackInfo(): attackInfo {
	return {
		minDamage: 25,
		averageDamage: 90,
		maxDamage: 150
	};
}

function getStatsInfo(sender: Fighter, receiver: Fighter): statsInfo {
	return {
		attackerStats: [
			sender.getAttack(),
			sender.getSpeed()
		],
		defenderStats: [
			receiver.getDefense(),
			receiver.getSpeed()
		],
		statsEffect: [
			0.8,
			0.2
		]
	};
}

export default use;