import {
	DraftBotPacket, PacketDirection, sendablePacket
} from "../DraftBotPacket";
import { OwnedPet } from "../../types/OwnedPet";

@sendablePacket(PacketDirection.BACK_TO_FRONT)
export class CommandFightHistoryItemPacket extends DraftBotPacket {
	fighterKeycloakId?: string;

	monsterId?: string;

	fightActionId!: string;

	usedFightActionId?: string; // Sometimes a fight action is used by another one

	customMessage?: boolean; // True if the fight action has an associated custom message instead of the default (only for attacks)

	status?: string; // See constants in FightAlterationResult or FightActionStatus for values

	pet?: OwnedPet;

	fightActionEffectDealt?: { // Stat change for the opponent in % (10 = 10%) can be negative
		newAlteration?: string;
		damages?: number;
		defense?: number;
		attack?: number;
		speed?: number;
		breath?: number; // This one is not in %
	};

	fightActionEffectReceived?: { // Stat change for the fighter in % (10 = 10%) can be negative
		newAlteration?: string;
		damages?: number;
		defense?: number;
		attack?: number;
		speed?: number;
		breath?: number; // This one is not in %
	};
}
