import {Fighter} from "../../../fighter/Fighter";
import {attackInfo, FightActionController, statsInfo} from "../../FightActionController";
import {PetAssistanceFunc} from "../../../../../data/PetAssistance";
import {PetAssistanceResult, PetAssistanceState} from "../../../../../../../Lib/src/types/PetAssistanceResult";
import {RandomUtils} from "../../../../../../../Lib/src/utils/RandomUtils";

function getAttackInfo(): attackInfo {
	return {
		minDamage: 5,
		averageDamage: 8,
		maxDamage: 15
	};
}

function getStatsInfo(_sender: Fighter, receiver: Fighter): statsInfo {
	return {
		attackerStats: [
			30,
			120
		],
		defenderStats: [
			receiver.getDefense(),
			receiver.getSpeed()
		],
		statsEffect: [
			0.9,
			0.1
		]
	};
}

const use: PetAssistanceFunc = (fighter, opponent, _turn, _fightController): Promise<PetAssistanceResult | null> => {
	// 20% chance of doing nothing
	if (RandomUtils.draftbotRandom.bool(0.2)) {
		return null;
	}
	return Promise.resolve({
		damages: FightActionController.getAttackDamage(getStatsInfo(fighter, opponent), fighter, getAttackInfo()),
		assistanceStatus: PetAssistanceState.SUCCESS
	});
};

export default use;