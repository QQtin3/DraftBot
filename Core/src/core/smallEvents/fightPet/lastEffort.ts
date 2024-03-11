import {FightPetActionFunc} from "../../../data/FightPetAction";
import {RandomUtils} from "../../utils/RandomUtils";
import {SmallEventConstants} from "../../../../../Lib/src/constants/SmallEventConstants";

export const fightPetAction: FightPetActionFunc = (player, pet) =>
// Chances of success is the ratio of remaining energy on total energy minus the rarity of the pet
	RandomUtils.draftbotRandom.bool(
		1 - player.getRatioCumulativeFightPoint()
		- pet.rarity * SmallEventConstants.FIGHT_PET.ENERGY_BASED_ACTIONS_RARITY_MULTIPLIER
	);
