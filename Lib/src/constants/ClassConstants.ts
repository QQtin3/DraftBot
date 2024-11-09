export abstract class ClassConstants {
	static readonly CLASS_KIND = {
		ATTACK: "attack",
		DEFENSE: "defense",
		BASIC: "basic",
		OTHER: "other"
	};

	static readonly CLASS_SMALL_EVENT_INTERACTIONS_NAMES = {
		WIN_WEAPON: "winWeapon",
		WIN_ARMOR: "winArmor",
		WIN_POTION: "winPotion",
		WIN_OBJECT: "winObject",
		WIN_ITEM: "winItem",
		WIN_HEALTH: "winHealth",
		WIN_MONEY: "winMoney"
	};

	static readonly CLASS_SMALL_EVENT_INTERACTIONS: {ATTACK:string[], DEFENSE: string[], BASIC: string[], OTHER: string[]} = {
		ATTACK: [
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_WEAPON,
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_POTION,
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_OBJECT
		],
		DEFENSE: [
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_ARMOR,
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_POTION,
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_OBJECT
		],
		BASIC: [
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_ITEM,
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_MONEY
		],
		OTHER: [
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_ITEM,
			ClassConstants.CLASS_SMALL_EVENT_INTERACTIONS_NAMES.WIN_HEALTH
		]
	};

	static readonly REQUIRED_LEVEL = 10;
}