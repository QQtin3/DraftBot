import {RandomUtils} from "../../../../Lib/src/utils/RandomUtils";
import {
	ReactionCollector,
	ReactionCollectorCreationPacket,
	ReactionCollectorEnded,
	ReactionCollectorReaction,
	ReactionCollectorReactPacket
} from "../../../../Lib/src/packets/interaction/ReactionCollectorPacket";
import {DraftBotPacket, makePacket, PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import {BlockingUtils} from "./BlockingUtils";
import {Constants} from "../../../../Lib/src/constants/Constants";
import {PacketUtils} from "./PacketUtils";

type CollectCallback = (collector: ReactionCollectorInstance, reaction: ReactionCollectorReaction, keycloakId: string, response: DraftBotPacket[]) => void | Promise<void>;

export type EndCallback = (collector: ReactionCollectorInstance, response: DraftBotPacket[]) => void | Promise<void>;

type FilterFunction = (collector: ReactionCollectorInstance, keycloakId: string, reactionIndex: number) => boolean | Promise<boolean>;

export type CollectorOptions = {
	time?: number;
	allowedPlayerKeycloakIds?: string[];
	reactionLimit?: number;
	mainPacket?: boolean;
};

type ReactionInfo = {
	keycloakId: string,
	reaction: {
		type: string,
		data: ReactionCollectorReaction
	}
};

export function createDefaultFilter(allowedPlayerKeycloakIds: string[]): FilterFunction {
	return (collector, keycloakId, reactionIndex) => allowedPlayerKeycloakIds.includes(keycloakId) && collector.isValidReactionIndex(reactionIndex);
}

const collectors: Map<string, ReactionCollectorInstance> = new Map<string, ReactionCollectorInstance>();

export class ReactionCollectorInstance {
	private id: string;

	private model: ReactionCollector;

	private readonly filter: FilterFunction;

	private readonly endTime: number;

	private readonly time: number;

	private readonly collectCallback: CollectCallback;

	private readonly _context: PacketContext;

	private readonly endCallback: EndCallback;

	private readonly reactionLimit: number;

	private reactionsHistory: ReactionInfo[] = [];

	private readonly mainPacket: boolean;

	public constructor(reactionCollector: ReactionCollector, context: PacketContext, collectorOptions: CollectorOptions, endCallback: EndCallback, collectCallback: CollectCallback = null) {
		this.model = reactionCollector;
		this.filter = collectorOptions.allowedPlayerKeycloakIds ? createDefaultFilter(collectorOptions.allowedPlayerKeycloakIds) : (): boolean => true;
		this.time = collectorOptions.time ?? Constants.MESSAGES.COLLECTOR_TIME;
		this.endTime = Date.now() + this.time;
		this.mainPacket = collectorOptions.mainPacket ?? true;
		this.collectCallback = collectCallback;
		this._context = context;
		this.endCallback = endCallback;
		this.reactionLimit = collectorOptions.reactionLimit ?? 1;
	}

	private _hasEnded: boolean;

	get hasEnded(): boolean {
		return this._hasEnded;
	}

	private set hasEnded(value: boolean) {
		this._hasEnded = value;
	}

	private _creationPacket: ReactionCollectorCreationPacket;

	get creationPacket(): ReactionCollectorCreationPacket {
		return this._creationPacket;
	}

	get context(): PacketContext {
		return this._context;
	}

	public async react(keycloakId: string, index: number, response: DraftBotPacket[]): Promise<void> {
		if (!this._creationPacket) {
			throw "Reaction collector has not been built yet";
		}

		const reaction = this._creationPacket.reactions[index];
		if (!await this.filter(this, keycloakId, index)) {
			return;
		}
		this.reactionsHistory.push({
			keycloakId,
			reaction
		});
		if (this.collectCallback) {
			await this.collectCallback(this, reaction, keycloakId, response);
		}
		if (this.reactionsHistory.length >= this.reactionLimit && this.reactionLimit > 0) {
			await this.end(response);
		}
	}

	public async end(response: DraftBotPacket[] = null): Promise<void> {
		const isResponseProvided = response !== null;
		if (this.hasEnded) {
			return;
		}
		this.hasEnded = true;
		collectors.delete(this.id);
		if (this.endCallback) {
			if (!isResponseProvided) {
				response = [];
			}
			await this.endCallback(this, response);
			if (!isResponseProvided && response.length !== 0) {
				PacketUtils.sendPackets(this._context, response);
			}
		}
	}

	public block(playerId: number, reason: string): this {
		BlockingUtils.blockPlayerUntil(playerId, reason, this.endTime);
		return this;
	}

	public getReactionsHistory(): ReactionInfo[] {
		return this.reactionsHistory;
	}

	public getFirstReaction(): ReactionInfo | null {
		return this.reactionsHistory.length !== 0 ? this.reactionsHistory[0] : null;
	}

	public build(): ReactionCollectorCreationPacket {
		if (this._creationPacket) {
			throw "Reaction collector has already been built";
		}

		// Register
		this.id = RandomUtils.draftbotRandom.uuid4();
		collectors.set(this.id, this);
		setTimeout(this.end, this.endTime - Date.now());

		this._creationPacket = makePacket(ReactionCollectorCreationPacket, this.model.creationPacket(this.id, this.endTime, this.mainPacket));
		return this._creationPacket;
	}

	public isValidReactionIndex(index: number): boolean {
		return index >= 0 && index < this._creationPacket.reactions.length;
	}
}

export class ReactionCollectorController {
	public static async reactPacket(packet: ReactionCollectorReactPacket, context: PacketContext, response: DraftBotPacket[]): Promise<void> {
		const collector: ReactionCollectorInstance = collectors.get(packet.id);
		if (!collector || collector.hasEnded) {
			const packet: ReactionCollectorEnded = makePacket(ReactionCollectorEnded, {});
			response.push(packet);
		}
		else {
			await collector.react(packet.keycloakId, packet.reactionIndex, response);
		}
	}
}