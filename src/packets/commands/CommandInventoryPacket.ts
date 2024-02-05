import {DraftBotPacket} from "../DraftBotPacket";
import {ItemNature, ItemRarity} from "../../constants/ItemConstants";

export class CommandInventoryPacketReq extends DraftBotPacket {
	askedPlayer!: {
		rank?: number,
		keycloakId?: string
	};
}

export interface MainItemDisplayPacket {
	id: number,
	emote: string,
	rarity: ItemRarity,
	attack: {
		value: number,
		maxValue: number
	},
	defense: {
		value: number,
		maxValue: number
	},
	speed: {
		value: number,
		maxValue: number
	},
}

export interface SupportItemDisplayPacket {
	id: number,
	emote: string,
	rarity: number,
	nature: ItemNature,
	power: number,
	maxPower: number
}

export class CommandInventoryPacketRes extends DraftBotPacket {
	foundPlayer!: boolean;

	keycloakId?: string;

	data?: {
		weapon: MainItemDisplayPacket,
		armor: MainItemDisplayPacket,
		potion: SupportItemDisplayPacket,
		object: SupportItemDisplayPacket,
		backupWeapons: { display: MainItemDisplayPacket, slot: number }[],
		backupArmors: { display: MainItemDisplayPacket, slot: number }[],
		backupPotions: { display: SupportItemDisplayPacket, slot: number }[],
		backupObjects: { display: SupportItemDisplayPacket, slot: number }[],
		slots: {
			weapons: number,
			armors: number,
			potions: number,
			objects: number
		}
	};
}