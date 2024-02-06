import {FightPetActionFunc} from "../../../data/FightPetAction";
import {SmallEventConstants} from "../../constants/SmallEventConstants";
import {RandomUtils} from "../../utils/RandomUtils";

export const fightPetAction: FightPetActionFunc = (player, pet) =>
	// Chances of success is based on the level of the player and the rarity of the pet
	RandomUtils.draftbotRandom.bool(
		Math.max(
			Math.min(SmallEventConstants.FIGHT_PET.INTIMIDATE_MAXIMUM_LEVEL, player.level)
			- pet.rarity * SmallEventConstants.FIGHT_PET.INTIMIDATE_RARITY_MULTIPLIER, 0
		) / 100);
