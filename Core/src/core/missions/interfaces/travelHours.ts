import {IMission} from "../IMission";
import {MissionDifficulty} from "../MissionDifficulty";
import {RandomUtils} from "../../../../../Lib/src/utils/RandomUtils";

export const missionInterface: IMission = {
	areParamsMatchingVariantAndSave: (variant, params) => (params.travelTime as number) >= variant,

	generateRandomVariant: (difficulty) => {
		switch (difficulty) {
		case MissionDifficulty.MEDIUM:
			return RandomUtils.draftbotRandom.integer(5, 7);
		case MissionDifficulty.HARD:
			return 9;
		default:
			return RandomUtils.draftbotRandom.integer(2, 3);
		}
	},

	initialNumberDone: () => 0,

	updateSaveBlob: () => null
};