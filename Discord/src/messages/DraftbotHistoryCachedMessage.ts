import {DraftbotCachedMessage, DraftbotCachedMessages} from "./DraftbotCachedMessage";
import {PacketContext} from "../../../Lib/src/packets/DraftBotPacket";
import {DiscordCache} from "../bot/DiscordCache";
import {KeycloakUtils} from "../../../Lib/src/keycloak/KeycloakUtils";
import {keycloakConfig} from "../bot/DraftBotShard";
import i18n from "../translations/i18n";
import {CommandFightHistoryItemPacket} from "../../../Lib/src/packets/fights/FightHistoryItemPacket";
import {EmoteUtils} from "../utils/EmoteUtils";
import {DraftBotIcons} from "../../../Lib/src/DraftBotIcons";
import {FightAlterationState} from "../../../Lib/src/types/FightAlterationResult";
import {FightConstants} from "../../../Lib/src/constants/FightConstants";
import {DraftbotFightStatusCachedMessage} from "./DraftbotFightStatusCachedMessage";

export class DraftbotHistoryCachedMessage extends DraftbotCachedMessage<CommandFightHistoryItemPacket> {
	readonly duration = 30;

	get type(): string {
		return "history";
	}

	updateMessage = async (packet: CommandFightHistoryItemPacket, context: PacketContext): Promise<void> => {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction)!;
		const fighter = packet.fighterKeycloakId ?
			(await KeycloakUtils.getUserByKeycloakId(keycloakConfig, packet.fighterKeycloakId))!.attributes.gameUsername[0] :
			i18n.t(`models:monster.${packet.monsterId}`, {lng: interaction.userLanguage});

		let newLine = i18n.t("commands:fight.actions.intro", {
			lng: interaction.userLanguage,
			emote: EmoteUtils.translateEmojiToDiscord(DraftBotIcons.fight_actions[packet.fightActionId]),
			fighter: fighter
		});
		let attackName = ""; // Name of the attack, used to display the attack name in the message
		if (packet.status && Object.values(FightAlterationState).includes(packet.status as FightAlterationState)) {
			// The fightAction is an alteration
			newLine += i18n.t(`models:fight_actions.${packet.fightActionId}.${packet.status}`, {
				lng: interaction.userLanguage
			});
		}
		else {
			// The fightAction is an attack
			attackName = i18n.t(`models:fight_actions.${packet.fightActionId}.name`, {
				lng: interaction.userLanguage,
				count: 1
			});
			newLine += i18n.t(`commands:fight.actions.attacksResults.${packet.status}`, {
				lng: interaction.userLanguage,
				attack: attackName
			});
		}

		// Then we need to display the side effects of the attack or alteration if there are any
		if (packet.fightActionEffectDealt) {
			Object.entries(packet.fightActionEffectDealt!).forEach(([key, value]) => {
				const operator = value >= 0 ? "+" : "-";
				newLine += i18n.t(`commands:fight.actions.fightActionEffects.opponent.${key}`, {
					lng: interaction.userLanguage,
					operator: operator,
					amount: Math.abs(value)
				});
			});
		}
		if (packet.fightActionEffectReceived) {
			Object.entries(packet.fightActionEffectReceived!).forEach(([key, value]) => {
				const operator = value >= 0 ? "+" : "-";
				newLine += i18n.t(`commands:fight.actions.fightActionEffects.self.${key}`, {
					lng: interaction.userLanguage,
					operator: operator,
					amount: Math.abs(value)
				});
			});
		}

		const previousHistory = this.storedMessage?.content || "";
		if (previousHistory.length + newLine.length <= FightConstants.MAX_HISTORY_LENGTH) {
			const history = `${previousHistory}\n${newLine}`;
			await this.post({content: history});
			return;
		}
		this.storedMessage = undefined;
		await this.post({content: newLine});
		const resumeMessage = DraftbotCachedMessages.getOrCreate(this.originalMessageId, DraftbotFightStatusCachedMessage);
		resumeMessage.storedMessage?.delete();
		resumeMessage.storedMessage = undefined;
		const attackSelectionMessage = DraftbotCachedMessages.getOrCreate(this.originalMessageId, DraftbotFightStatusCachedMessage /* TODO */);
		attackSelectionMessage.storedMessage?.delete();
		attackSelectionMessage.storedMessage = undefined;
	};
}
