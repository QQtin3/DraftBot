import {DraftBotPacket, PacketDirection, sendablePacket} from "../DraftBotPacket";
import {TopDataType} from "../../enums/TopDataType";
import {TopScope} from "../../enums/TopScope";
import {TopTiming} from "../../enums/TopTimings";
import {TopElement, TopElementScoreFirstType} from "../../interfaces/TopElement";

@sendablePacket(PacketDirection.FRONT_TO_BACK)
export class CommandTopPacketReq extends DraftBotPacket {
	dataType!: TopDataType;

	scope!: TopScope;

	timing!: TopTiming;

	page?: number;
}

@sendablePacket(PacketDirection.NONE)
export class CommandTopPacketRes<T extends TopElement<U, V, W>, U, V, W> extends DraftBotPacket {
	scope!: TopScope;

	timing!: TopTiming;

	minRank!: number;

	maxRank!: number;

	contextRank?: number;

	canBeRanked!: boolean;

	elements!: T[];

	totalElements!: number;
}

// Attributes: mapType and afk, score, level
@sendablePacket(PacketDirection.BACK_TO_FRONT)
export class CommandTopPacketResScore extends CommandTopPacketRes<TopElement<TopElementScoreFirstType, number, number>, TopElementScoreFirstType, number, number> {}

// Attributes: leagueId, glory, level
@sendablePacket(PacketDirection.BACK_TO_FRONT)
export class CommandTopPacketResGlory extends CommandTopPacketRes<TopElement<number, number, number>, number, number, number> {
	needFight!: number;
}

// Attributes: guild points, level, none
@sendablePacket(PacketDirection.BACK_TO_FRONT)
export class CommandTopPacketResGuild extends CommandTopPacketRes<TopElement<number, number, undefined>, number, number, undefined> {}