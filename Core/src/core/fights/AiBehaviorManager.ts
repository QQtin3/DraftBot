import {FightView} from "./FightView";
import {FightAction} from "../../data/FightAction";
import {AiPlayerFighter} from "./fighter/AiPlayerFighter";
import {ClassConstants} from "../../../../Lib/src/constants/ClassConstants";
import KnightFightBehavior from "./aiClassBehaviors/KnightFightBehavior";
import HorseRiderFightBehavior from "./aiClassBehaviors/HorseRiderFightBehavior";
import EsquireFightBehavior from "./aiClassBehaviors/EsquireFightBehavior";
import MysticMageFightBehavior from "./aiClassBehaviors/MysticMageFightBehavior";
import GunnerFightBehavior from "./aiClassBehaviors/GunnerFightBehavior";
import InfantryManFightBehavior from "./aiClassBehaviors/InfantrymanFightBehavior";

export interface ClassBehavior {
	chooseAction(fighter: AiPlayerFighter, fightView: FightView): FightAction;
}

// Map to store class behaviors by class ID
const classBehaviors = new Map<number, ClassBehavior>();

/**
 * Initialize all class behaviors in a map so they can be accessed by class ID
 */
export function initializeAllClassBehaviors(): void {
	registerClassBehavior(ClassConstants.CLASSES_ID.KNIGHT, new KnightFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.VALIANT_KNIGHT, new KnightFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.PIKEMAN, new KnightFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.HORSE_RIDER, new HorseRiderFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.ESQUIRE, new EsquireFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.MYSTIC_MAGE, new MysticMageFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.GUNNER, new GunnerFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.FORMIDABLE_GUNNER, new GunnerFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.INFANTRYMAN, new InfantryManFightBehavior());
	registerClassBehavior(ClassConstants.CLASSES_ID.POWERFUL_INFANTRYMAN, new InfantryManFightBehavior());
}

/**
 * Register a class behavior
 * @param classId The class ID
 * @param behavior The behavior implementation
 */
export function registerClassBehavior(classId: number, behavior: ClassBehavior): void {
	classBehaviors.set(classId, behavior);
}

/**
 * Get a class behavior by class ID
 * @param classId The class ID
 * @returns The class behavior or undefined if not found
 */
export function getAiClassBehavior(classId: number): ClassBehavior | undefined {
	return classBehaviors.get(classId);
}