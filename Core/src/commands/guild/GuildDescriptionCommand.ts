import {commandRequires, CommandUtils} from "../../core/utils/CommandUtils";
import {GuildConstants} from "../../../../Lib/src/constants/GuildConstants";
import {GuildRole} from "../../../../Lib/src/types/GuildRole";
import {DraftBotPacket, makePacket, PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import Player from "../../core/database/game/models/Player";
import {EndCallback, ReactionCollectorInstance} from "../../core/utils/ReactionsCollector";
import {ReactionCollectorAcceptReaction} from "../../../../Lib/src/packets/interaction/ReactionCollectorPacket";
import {BlockingUtils} from "../../core/utils/BlockingUtils";
import {BlockingConstants} from "../../../../Lib/src/constants/BlockingConstants";
import {Guilds} from "../../core/database/game/models/Guild";
import {draftBotInstance} from "../../index";
import {ReactionCollectorGuildDescription} from "../../../../Lib/src/packets/interaction/ReactionCollectorGuildDescription";
import {
	CommandGuildDescriptionAcceptPacketRes,
	CommandGuildDescriptionNoGuildPacket, CommandGuildDescriptionNotAnElderPacket, CommandGuildDescriptionPacketReq,
	CommandGuildDescriptionRefusePacketRes
} from "../../../../Lib/src/packets/commands/CommandGuildDescriptionPacket";

async function acceptGuildDescription(player: Player, description: string, response: DraftBotPacket[]): Promise<void> {
	await player.reload();
	if (!player.guildId) {
		response.push(makePacket(CommandGuildDescriptionNoGuildPacket, {}));
		return;
	}
	const guild = await Guilds.getById(player.guildId);
	if (!guild.isChiefOrElder(player)) {
		response.push(makePacket(CommandGuildDescriptionNotAnElderPacket, {}));
		return;
	}
	guild.guildDescription = description;
	response.push(makePacket(CommandGuildDescriptionAcceptPacketRes, {}));
	await guild.save();
	draftBotInstance.logsDatabase.logGuildDescriptionChange(player.keycloakId, guild).then();
}

function endCallback(player: Player, description: string): EndCallback {
	return async (collector, response): Promise<void> => {
		const reaction = collector.getFirstReaction();
		if (reaction && reaction.reaction.type === ReactionCollectorAcceptReaction.name) {
			await acceptGuildDescription(player, description, response);
		}
		else {
			response.push(makePacket(CommandGuildDescriptionRefusePacketRes, {}));
		}
		BlockingUtils.unblockPlayer(player.keycloakId, BlockingConstants.REASONS.GUILD_DESCRIPTION);
	};
}

export default class GuildDescriptionCommand {
	@commandRequires(CommandGuildDescriptionPacketReq, {
		notBlocked: true,
		disallowedEffects: CommandUtils.DISALLOWED_EFFECTS.NOT_STARTED_OR_DEAD,
		level: GuildConstants.REQUIRED_LEVEL,
		guildNeeded: true,
		guildRoleNeeded: GuildRole.ELDER,
		whereAllowed: CommandUtils.WHERE.EVERYWHERE
	})
	async execute(response: DraftBotPacket[], player: Player, packet: CommandGuildDescriptionPacketReq, context: PacketContext): Promise<void> {
		if (!player.guildId) {
			response.push(makePacket(CommandGuildDescriptionNoGuildPacket, {}));
			return;
		}
		const guild = await Guilds.getById(player.guildId);
		if (!guild.isChiefOrElder(player)) {
			response.push(makePacket(CommandGuildDescriptionNotAnElderPacket, {}));
			return;
		}
		const collector = new ReactionCollectorGuildDescription(
			packet.description
		);

		const collectorPacket = new ReactionCollectorInstance(
			collector,
			context,
			{
				allowedPlayerKeycloakIds: [player.keycloakId],
				reactionLimit: 1
			},
			endCallback(player,packet.description)
		)
			.block(player.keycloakId, BlockingConstants.REASONS.GUILD_DESCRIPTION)
			.build();

		response.push(collectorPacket);
	}
}