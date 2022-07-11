import {Fighter} from "./Fighter";
import {FightState} from "./FightState";
import {FightView} from "./FightView";
import {RandomUtils} from "../utils/RandomUtils";
import {FightConstants} from "../constants/FightConstants";
import {TextBasedChannel} from "discord.js";
import {FighterStatus} from "./FighterStatus";
import {IFightAction} from "../fightActions/IFightAction";
import {FightActionController} from "../fightActions/FightActionController";
import {BlockingUtils} from "../utils/BlockingUtils";
import {MissionsController} from "../missions/MissionsController";
import {BlockingConstants} from "../constants/BlockingConstants";

/**
 * @class FightController
 */
export class FightController {

	turn: number;

	private readonly fighters: Fighter[];

	private readonly fightView: FightView

	private state: FightState;

	private readonly friendly: boolean;

	public constructor(fighter1: Fighter, fighter2: Fighter, friendly: boolean, channel: TextBasedChannel, language: string) {
		this.fighters = [fighter1, fighter2];
		this.state = FightState.NOT_STARTED;
		this.turn = 1;
		this.friendly = friendly;
		this.fightView = new FightView(channel, language, this);
	}

	/**
	 * start a fight
	 * @public
	 */
	public async startFight() {
		// make the fighters ready
		const potionsToUse = [];
		for (let i = 0; i < this.fighters.length; i++) {
			potionsToUse.push(this.fighters[i].consumePotionIfNeeded(this.friendly, this.fightView.channel, this.fightView.language));
			this.fighters[i].block();
		}
		await Promise.all(potionsToUse);

		// the player with the highest speed start the fight
		if (this.fighters[1].stats.speed > this.fighters[0].stats.speed || RandomUtils.draftbotRandom.bool() && this.fighters[1].stats.speed === this.fighters[0].stats.speed) {
			this.invertFighters();
		}
		await this.fightView.introduceFight(this.fighters[0], this.fighters[1]);
		this.state = FightState.RUNNING;
		await this.prepareNextTurn();
	}

	/**
	 * Get the playing fighter or null if the fight is not running
	 * @return {Fighter|null}
	 */
	public getPlayingFighter() {
		return this.state === FightState.RUNNING ? this.fighters[(this.turn - 1) % 2] : null;
	}

	/**
	 * Get the defending fighter or null if the fight is not running
	 * @return {Fighter|null}
	 */
	public getDefendingFighter() {
		return this.state === FightState.RUNNING ? this.fighters[this.turn % 2] : null;
	}

	/**
	 * Count the amount of god moves used by both players
	 * @param sender
	 * @param receiver
	 */
	static getUsedGodMoves(sender: Fighter, receiver: Fighter) {
		return sender.fightActionsHistory.filter(action =>
			action === FightConstants.ACTION_ID.BENEDICTION ||
				action === FightConstants.ACTION_ID.DIVINE_ATTACK).length
			+ receiver.fightActionsHistory.filter(action =>
				action === FightConstants.ACTION_ID.BENEDICTION ||
				action === FightConstants.ACTION_ID.DIVINE_ATTACK).length;
	}

	/**
	 * End the fight
	 */
	public endFight() {
		this.state = FightState.FINISHED;

		this.checkNegativeFightPoints();

		const winner = this.getWinner();
		const isADraw = this.isADraw();
		for (const fighter of this.fighters) {
			BlockingUtils.unblockPlayer(fighter.getUser().id, BlockingConstants.REASONS.FIGHT);
		}

		if (isADraw) {
			console.log("Fight ended; " +
				`equality between: ${this.fighters[winner].getUser().id} (${this.fighters[winner].stats.fightPoints}/${this.fighters[winner].stats.maxFightPoint}); ` +
				`and: ${this.fighters[1 - winner].getUser().id} (${this.fighters[1 - winner].stats.fightPoints}/${this.fighters[1 - winner].stats.maxFightPoint}); ` +
				`turns: ${this.turn}`);
		}
		else {
			console.log("Fight ended; " +
				`winner: ${this.fighters[winner].getUser().id} (${this.fighters[winner].stats.fightPoints}/${this.fighters[winner].stats.maxFightPoint}); ` +
				`loser: ${this.fighters[1 - winner].getUser().id} (${this.fighters[1 - winner].stats.fightPoints}/${this.fighters[1 - winner].stats.maxFightPoint}); ` +
				`turns: ${this.turn}`);
		}
		this.fightView.outroFight(this.fighters[(1 - winner) % 2], this.fighters[winner % 2], isADraw).finally(() => null);
		for (const fighter of this.fighters) {
			this.manageMissionsOf(fighter).finally(() => null);
		}
		if (winner !== 2) {
			Promise.all([
				MissionsController.update(this.fighters[winner].entity, this.fightView.channel, this.fightView.language, {
					missionId: "fightHealthPercent", params: {
						remainingPercent: this.fighters[winner].stats.fightPoints / this.fighters[winner].stats.maxFightPoint
					}
				}),
				MissionsController.update(this.fighters[winner].entity, this.fightView.channel, this.fightView.language, {
					missionId: "finishWithAttack",
					params: {
						lastAttack: this.fighters[winner].fightActionsHistory.at(-1)
					}
				})
			]).finally(() => null);
		}
	}

	/**
	 * check if any of the fighters has negative fight points
	 * @private
	 */
	private checkNegativeFightPoints() {
		// set the fight points to 0 if any of the fighters have fight points under 0
		for (const fighter of this.fighters) {
			if (fighter.stats.fightPoints < 0) {
				fighter.stats.fightPoints = 0;
			}
		}
	}

	/**
	 * Get the winner of the fight (or null if it's a draw)
	 * @private
	 */
	private getWinner(): number {
		return this.fighters[0].isDead() ? 1 : 0;
	}

	/**
	 * check if the fight is a draw
	 * @private
	 */
	private isADraw(): boolean {
		return this.fighters[0].isDead() === this.fighters[1].isDead() || this.turn >= FightConstants.MAX_TURNS;
	}

	/**
	 * manage the mission of a fighter
	 * @param fighter
	 * @private
	 */
	private async manageMissionsOf(fighter: Fighter): Promise<void> {
		await this.checkFightActionHistory(fighter);
		if (this.friendly) {
			await MissionsController.update(fighter.entity, this.fightView.channel, this.fightView.language, {missionId: "friendlyFight"});
		}
		else {
			await MissionsController.update(fighter.entity, this.fightView.channel, this.fightView.language, {missionId: "rankedFight"});
		}
		await MissionsController.update(fighter.entity, this.fightView.channel, this.fightView.language, {missionId: "anyFight"});
	}

	/**
	 * check the fight action history of a fighter
	 * @param fighter
	 * @private
	 */
	private async checkFightActionHistory(fighter: Fighter) {
		const playerFightActionsHistory: Map<string, number> = fighter.getFightActionCount();
		// iterate on each action in the history
		const updates = [];
		for (const [action, count] of playerFightActionsHistory) {
			updates.push(MissionsController.update(fighter.entity, this.fightView.channel, this.fightView.language, {
				missionId: "fightAttacks",
				count, params: {attackType: action}
			}));
		}
		await Promise.all(updates);
	}

	/**
	 * execute a turn of a fight
	 * @private
	 */
	private async prepareNextTurn() {
		if (this.getPlayingFighter().hasFightAlteration()) {
			await this.executeFightAction(this.getPlayingFighter().getAlterationFightAction(), false);
		}
		await this.fightView.displayFightStatus();
		if (this.getPlayingFighter().nextFightActionId === null) {
			await this.fightView.selectFightActionMenu(this.getPlayingFighter());
		}
		else {
			await this.executeFightAction(FightActionController.getFightActionInterface(this.getPlayingFighter().nextFightActionId), true);
		}
	}

	/**
	 * Change who is the player 1 and who is the player 2.
	 * The player 1 start the fight.
	 * @private
	 */
	private invertFighters() {
		const temp = this.fighters[0];
		this.fighters[0] = this.fighters[1];
		this.fighters[1] = temp;
		this.fighters[0].setStatus(FighterStatus.ATTACKER);
		this.fighters[1].setStatus(FighterStatus.DEFENDER);
	}

	/**
	 * execute the next fight action
	 * @param fightAction {IFightAction} the fight action to execute
	 * @param endTurn {boolean} true if the turn should be ended after the action has been executed
	 */
	public async executeFightAction(fightAction: IFightAction, endTurn: boolean) {
		if (endTurn) {
			this.getPlayingFighter().nextFightActionId = null;
		}
		const receivedMessage = fightAction.use(this.getPlayingFighter(), this.getDefendingFighter(), this.turn, this.fightView.language);
		await this.fightView.updateHistory(fightAction.getEmoji(), this.getPlayingFighter().getMention(), receivedMessage);
		this.getPlayingFighter().fightActionsHistory.push(fightAction.getName());
		if (this.hadEnded()) {
			this.endFight();
			return;
		}
		if (endTurn) {
			this.turn++;
			await this.prepareNextTurn();
		}
	}

	/**
	 * check if a fight has ended or not
	 * @private
	 */
	private hadEnded() {
		return (
			this.turn >= FightConstants.MAX_TURNS ||
			this.getPlayingFighter().isDeadOrBug() ||
			this.getDefendingFighter().isDeadOrBug() ||
			this.state !== FightState.RUNNING);
	}
}
