import { SmallEventAddSomething } from "./SmallEventPacket";
import {
	PacketDirection, sendablePacket
} from "../DraftBotPacket";

@sendablePacket(PacketDirection.BACK_TO_FRONT)
export class SmallEventWinGuildXPPacket extends SmallEventAddSomething {
	guildName!: string;
}
