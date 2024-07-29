import {DraftBotPacket, PacketDirection, sendablePacket} from "../DraftBotPacket";

@sendablePacket(PacketDirection.BACK_TO_FRONT)
export class ItemAcceptPacket extends DraftBotPacket {
	id!: number;

	category!: number;
}