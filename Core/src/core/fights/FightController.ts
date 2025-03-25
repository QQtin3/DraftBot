import {Fighter} from "./fighter/Fighter";
import {FightState} from "./FightState";
import {FightView} from "./FightView";
import {RandomUtils} from "../../../../Lib/src/utils/RandomUtils";
import {FightConstants} from "../../../../Lib/src/constants/FightConstants";
import {FighterStatus} from "./FighterStatus";
import {FightOvertimeBehavior} from "./FightOvertimeBehavior";
import {MonsterFighter} from "./fighter/MonsterFighter";
import {PlayerFighter} from "./fighter/PlayerFighter";
import {PVEConstants} from "../../../../Lib/src/constants/PVEConstants";
import {DraftBotPacket, PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import {attackInfo, FightActionController, statsInfo} from "./actions/FightActionController";
import {FightAction, FightActionDataController} from "../../data/FightAction";
import {FightStatModifierOperation} from "../../../../Lib/src/types/FightStatModifierOperation";
import {FightAlterationResult, FightAlterationState} from "../../../../Lib/src/types/FightAlterationResult";
import {FightActionResult} from "../../../../Lib/src/types/FightActionResult";
import {AiPlayerFighter} from "./fighter/AiPlayerFighter";
import {FightAlteration, FightAlterationDataController} from "../../data/FightAlteration";
import {PetAssistance} from "../../data/PetAssistance";
import {getAiPetBehavior} from "./PetAssistManager";
import {PetEntities} from "../database/game/models/PetEntity";

/**
 * @class FightController
 */
export class FightController {

	turn: number;

	public readonly fighters: (PlayerFighter | MonsterFighter | AiPlayerFighter)[];

	public readonly fightInitiator: PlayerFighter;

	private readonly _fightView: FightView;

	private state: FightState;

	private endCallback: (fight: FightController, response: DraftBotPacket[]) => Promise<void>;

	private readonly overtimeBehavior: FightOvertimeBehavior;

	public constructor(
		fighters: {
			fighter1: PlayerFighter,
			fighter2: (MonsterFighter | AiPlayerFighter)
		},
		overtimeBehavior: FightOvertimeBehavior,
		context: PacketContext
	) {
		this.fighters = [fighters.fighter1, fighters.fighter2];
		this.fightInitiator = fighters.fighter1;
		this.state = FightState.NOT_STARTED;
		this.turn = 1;
		this._fightView = new FightView(context, this);
		this.overtimeBehavior = overtimeBehavior;
	}

	/**
	 * Start a fight
	 * @public
	 */
	public async startFight(response: DraftBotPacket[]): Promise<void> {
		// Make the fighters ready
		for (let i = 0; i < this.fighters.length; i++) {
			await this.fighters[i].startFight(this._fightView, i === 0 ? FighterStatus.ATTACKER : FighterStatus.DEFENDER);
		}

		this._fightView.introduceFight(response, this.fighters[0] as PlayerFighter, this.fighters[1] as MonsterFighter | AiPlayerFighter);

		// The player with the highest speed starts the fight
		if (this.fighters[1].getSpeed() > this.fighters[0].getSpeed() || RandomUtils.draftbotRandom.bool() && this.fighters[1].getSpeed() === this.fighters[0].getSpeed()) {
			this.invertFighters();
		}
		this.state = FightState.RUNNING;
		await this.prepareNextTurn(response);
	}

	/**
	 * Get the playing fighter or null if the fight is not running
	 * @return {Fighter|null}
	 */
	public getPlayingFighter(): PlayerFighter | MonsterFighter | AiPlayerFighter {
		return this.state === FightState.RUNNING ? this.fighters[0] : null;
	}

	/**
	 * Get the defending fighter or null if the fight is not running
	 * @return {Fighter|null}
	 */
	public getDefendingFighter(): PlayerFighter | MonsterFighter | AiPlayerFighter {
		return this.state === FightState.RUNNING ? this.fighters[1] : null;
	}

	/**
	 * End the fight
	 * @param response {DraftBotPacket[]} the response to send to the player
	 */
	public async endFight(response: DraftBotPacket[]): Promise<void> {
		this.state = FightState.FINISHED;

		this.checkNegativeEnergy();

		const winner = this.getWinner(); // 1 for the fight initiator, 0 for the opponent
		const isADraw = this.isADraw();

		this._fightView.outroFight(response, this.fighters[(1 - winner) % 2], this.fighters[winner % 2], isADraw);

		for (let i = 0; i < this.fighters.length; ++i) {
			await this.fighters[i].endFight(this._fightView, i === winner);
		}
		if (this.endCallback) {
			await this.endCallback(this, response);
		}
	}

	/**
	 * Cancel a fight and unblock the fighters, used when a fight has bugged (for example, if a message was deleted)
	 * @param response {DraftBotPacket[]}
	 */
	endBugFight(response: DraftBotPacket[]): void {
		this.state = FightState.BUG;
		for (const fighter of this.fighters) {
			fighter.unblock();
		}
		this._fightView.displayBugFight(response);
	}

	/**
	 * Get the winner of the fight does not check for draw
	 * @return {number} 1 for the fight initiator, 0 for the opponent
	 * @private
	 */
	public getWinner(): number {
		return this.fighters[0].isDead() ? 1 : 0;
	}

	/**
	 * Get the winner fighter of the fight
	 * @return {Fighter|null} the winner fighter or null if there is no winner
	 * @private
	 */
	public getWinnerFighter(): Fighter {
		return this.fighters[0].isDead() ? this.fighters[1].isDead() ? null : this.fighters[1] : this.fighters[0];
	}

	/**
	 * Check if the fight is a draw
	 * @private
	 */
	public isADraw(): boolean {
		return this.fighters[0].isDead() === this.fighters[1].isDead() || this.turn >= FightConstants.MAX_TURNS && !(this.fighters[0].isDead() || this.fighters[1].isDead());
	}

	/**
	 * Execute a fight alteration
	 * @param alteration
	 * @param response
	 * @private
	 */
	private async executeFightAlteration(alteration: FightAlteration, response: DraftBotPacket[]): Promise<void> {
		const result = alteration.happen(this.getPlayingFighter(), this.getDefendingFighter(), this.turn, this);
		await this._fightView.addActionToHistory(response, this.getPlayingFighter(), alteration, result);
		if (this.hadEnded()) {
			await this.endFight(response);
			return;
		}
		this._fightView.displayFightStatus(response);
	}

	/**
	 * Execute a pet assistance
	 * @param petAssistance
	 * @param response
	 * @private
	 */
	private async executePetAssistance(petAssistance: PetAssistance, response: DraftBotPacket[]): Promise<void> {
		const result = await petAssistance.execute(this.getPlayingFighter(), this.getDefendingFighter(), this.turn, this);
		if (!result) {
			return;
		}
		await this._fightView.addActionToHistory(response, this.getPlayingFighter(), petAssistance, result);
		if (this.hadEnded()) {
			await this.endFight(response);
			return;
		}
		this._fightView.displayFightStatus(response);
	}

	/**
	 * Execute the next fight action
	 * @param fightAction {FightAction} the fight action to execute
	 * @param endTurn {boolean} true if the turn should be ended after the action has been executed
	 * @param response {DraftBotPacket[]} the response to send to the player
	 */
	public async executeFightAction(fightAction: FightAction, endTurn: boolean, response: DraftBotPacket[]): Promise<void> {
		if (endTurn) {
			this.getPlayingFighter().nextFightAction = null;
		}

		// Get the current fighters
		const attacker = this.getPlayingFighter();
		const defender = this.getDefendingFighter();

		const __ret = this.handleOutOfBreathScenarios(attacker, fightAction, defender);
		fightAction = __ret.fightAction;
		const result = __ret.result;

		// Check if we need to use the out-of-breath action instead
		if ("state" in result) {
			// If the result is a fight alteration result, that means that the player did not have enough breath
			fightAction = FightAlterationDataController.instance.getById(FightConstants.FIGHT_ACTIONS.ALTERATION.OUT_OF_BREATH);
		}
		await this._fightView.addActionToHistory(response, attacker, fightAction, result);

		if (this.state !== FightState.RUNNING) {
			// An error occurred during the update of the history
			return;
		}
		attacker.fightActionsHistory.push(fightAction);
		if (this.overtimeBehavior === FightOvertimeBehavior.END_FIGHT_DRAW && this.turn >= FightConstants.MAX_TURNS || this.hadEnded()) {
			await this.endFight(response);
			return;
		}
		if (endTurn) {
			this.turn++;
			this.invertFighters();
			this.getPlayingFighter().regenerateBreath(this.turn < 3);
			await this.prepareNextTurn(response);
		}
		else {
			this._fightView.displayFightStatus(response);
		}
	}

	/**
	 * Handle the out-of-breath scenarios
	 * @param attacker
	 * @param fightAction
	 * @param defender
	 * @private
	 */
	private handleOutOfBreathScenarios(
		attacker: PlayerFighter | MonsterFighter | AiPlayerFighter,
		fightAction: FightAction,
		defender: PlayerFighter | MonsterFighter | AiPlayerFighter
	): { fightAction: FightAction, result: FightActionResult | FightAlterationResult } {
		// Check if the attacker has enough breath
		const enoughBreath = attacker.useBreath(fightAction.breath);
		let result: FightActionResult | FightAlterationResult;

		// Handle out of breath scenario
		if (!enoughBreath) {
			if (RandomUtils.draftbotRandom.bool(FightConstants.OUT_OF_BREATH_FAILURE_PROBABILITY)) {
				const outOfBreathAction = FightAlterationDataController.instance.getById(FightConstants.FIGHT_ACTIONS.ALTERATION.OUT_OF_BREATH);
				result = outOfBreathAction.happen(attacker, defender, this.turn, this);
				fightAction = outOfBreathAction;
			}
			else {
				attacker.setBreath(0);
				result = fightAction.use(attacker, defender, this.turn, this);
			}
		}
		else {
			// Execute the action normally
			result = fightAction.use(attacker, defender, this.turn, this);
		}
		return {fightAction, result};
	}

	/**
	 * Set a callback to be called when the fight ends
	 * @param callback
	 */
	public setEndCallback(callback: (fight: FightController, response: DraftBotPacket[]) => Promise<void>): void {
		this.endCallback = callback;
	}

	/**
	 * Check if any of the fighters has negative energy
	 * @private
	 */
	private checkNegativeEnergy(): void {
		// Set the energy to 0 if any of the fighters have energy under 0
		for (const fighter of this.fighters) {
			if (fighter.getEnergy() < 0) {
				fighter.setBaseEnergy(0);
			}
		}
	}

	/**
	 * Execute a turn of a fight
	 * @private
	 */
	private async prepareNextTurn(response: DraftBotPacket[]): Promise<void> {

		if (this.overtimeBehavior === FightOvertimeBehavior.INCREASE_DAMAGE_PVE && this.turn >= FightConstants.MAX_TURNS) {
			this.increaseDamagesPve(this.turn);
		}

		const currentFighter = this.getPlayingFighter();
		if ((currentFighter instanceof AiPlayerFighter || currentFighter instanceof PlayerFighter) && currentFighter.player.petId) {
			const playerPet = await PetEntities.getById(currentFighter.player.petId);
			if (playerPet) {
				const petAction = getAiPetBehavior(playerPet.typeId);
				if (petAction) {
					await this.executePetAssistance(petAction, response);
				}
			}
		}
		if (this.state !== FightState.RUNNING) {
			// A player was killed by a pet action, no need to continue the fight
			return;
		}


		if (this.getPlayingFighter()
			.hasFightAlteration()) {
			await this.executeFightAlteration(this.getPlayingFighter().alteration, response);
		}
		if (this.state !== FightState.RUNNING) {
			// A player was killed by a fight alteration, no need to continue the fight
			return;
		}

		this._fightView.displayFightStatus(response);

		this.getPlayingFighter()
			.reduceCounters();

		// If the player is fighting a monster, and it's his first turn, then use the "rage explosion" action without changing turns
		if (this.turn < 3 && this.getDefendingFighter() instanceof MonsterFighter && (this.getPlayingFighter() as PlayerFighter).player.rage > 0) {
			await this.executeFightAction(FightActionDataController.instance.getById("rageExplosion"), false, response);
			if (this.hadEnded()) {
				return;
			}
		}

		if (this.getPlayingFighter().nextFightAction === null) {
			try {
				await this.getPlayingFighter()
					.chooseAction(this._fightView, response);
			}
			catch (e) {
				console.log("### FIGHT MESSAGE DELETED OR LOST : displayFightStatus ###");
				console.error(e.stack);
				this.endBugFight(response);
			}
		}
		else {
			await this.executeFightAction(this.getPlayingFighter().nextFightAction, true, response);
		}
	}

	private increaseDamagesPve(currentTurn: number): void {
		for (const fighter of this.fighters) {
			if (fighter instanceof MonsterFighter) {
				if (currentTurn - FightConstants.MAX_TURNS < PVEConstants.DAMAGE_INCREASED_DURATION) {
					fighter.applyAttackModifier({
						operation: FightStatModifierOperation.MULTIPLIER,
						value: 1.2,
						origin: null
					});
					fighter.applyDefenseModifier({
						operation: FightStatModifierOperation.MULTIPLIER,
						value: 1.2,
						origin: null
					});
					fighter.applySpeedModifier({
						operation: FightStatModifierOperation.MULTIPLIER,
						value: 1.2,
						origin: null
					});
				}
				fighter.applyDamageMultiplier(1.2, PVEConstants.DAMAGE_INCREASED_DURATION);
			}
		}
	}

	/**
	 * Change who is player 1 and who is player 2.
	 * @private
	 */
	private invertFighters(): void {
		const temp = this.fighters[0];
		this.fighters[0] = this.fighters[1];
		this.fighters[1] = temp;
		this.fighters[0].setStatus(FighterStatus.ATTACKER);
		this.fighters[1].setStatus(FighterStatus.DEFENDER);
	}

	/**
	 * Check if a fight has ended or not
	 * @private
	 */
	private hadEnded(): boolean {
		return (
			this.getPlayingFighter()
				.isDeadOrBug() ||
			this.getDefendingFighter()
				.isDeadOrBug() ||
			this.state !== FightState.RUNNING);
	}
}

/**
 * Get the number of used god moves in the fight
 * @param sender
 * @param receiver
 */
export function getUsedGodMoves(sender: Fighter, receiver: Fighter): number {
	return sender.fightActionsHistory.filter(action => FightConstants.GOD_MOVES.includes(action.id)).length +
		receiver.fightActionsHistory.filter(action => FightConstants.GOD_MOVES.includes(action.id)).length;
}

/**
 * Default heal fight alteration result
 * @param affected
 */
export function defaultHealFightAlterationResult(affected: Fighter): FightAlterationResult {
	affected.removeAlteration();
	return {
		state: FightAlterationState.STOP
	};
}

/**
 * Default max uses fight alteration result
 */
export function defaultFightAlterationResult(): FightAlterationResult {
	return {
		state: FightAlterationState.ACTIVE
	};
}

/**
 * Default max uses fight alteration result
 * @param affected
 */
export function defaultRandomActionFightAlterationResult(affected: Fighter): FightAlterationResult {
	affected.nextFightAction = affected.getRandomAvailableFightAction();
	return {
		state: FightAlterationState.RANDOM_ACTION
	};
}

/**
 * Default damage fight alteration result
 * @param affected
 * @param statsInfos
 * @param attackInfo
 */
export function defaultDamageFightAlterationResult(affected: Fighter, statsInfos: statsInfo, attackInfo: attackInfo): FightAlterationResult {
	return {
		state: FightAlterationState.ACTIVE,
		damages: FightActionController.getAttackDamage(statsInfos, affected, attackInfo, true)
	};
}