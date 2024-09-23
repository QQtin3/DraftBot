import {packetHandler} from "../PacketHandler";
import {WebSocket} from "ws";
import {PacketContext} from "../../../../Lib/src/packets/DraftBotPacket";
import {SmallEventAdvanceTimePacket} from "../../../../Lib/src/packets/smallEvents/SmallEventAdvanceTimePacket";
import {DiscordCache} from "../../bot/DiscordCache";
import {DraftbotSmallEventEmbed} from "../../messages/DraftbotSmallEventEmbed";
import {Language} from "../../../../Lib/src/Language";
import {StringUtils} from "../../utils/StringUtils";
import {SmallEventBigBadPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventBigBadPacket";
import {SmallEventBigBadKind} from "../../../../Lib/src/enums/SmallEventBigBadKind";
import i18n from "../../translations/i18n";
import {DraftBotIcons} from "../../../../Lib/src/DraftBotIcons";
import {SmallEventBoatAdvicePacket} from "../../../../Lib/src/packets/smallEvents/SmallEventBoatAdvicePacket";
import {
	SmallEventGoToPVEIslandAcceptPacket,
	SmallEventGoToPVEIslandNotEnoughGemsPacket,
	SmallEventGoToPVEIslandRefusePacket
} from "../../../../Lib/src/packets/smallEvents/SmallEventGoToPVEIslandPacket";
import {KeycloakUtils} from "../../../../Lib/src/keycloak/KeycloakUtils";
import {keycloakConfig} from "../../bot/DraftBotShard";
import {
	SmallEventLotteryLosePacket,
	SmallEventLotteryNoAnswerPacket,
	SmallEventLotteryPoorPacket,
	SmallEventLotteryWinPacket
} from "../../../../Lib/src/packets/smallEvents/SmallEventLotteryPacket";
import {
	InteractOtherPlayerInteraction,
	SmallEventInteractOtherPlayersAcceptToGivePoorPacket,
	SmallEventInteractOtherPlayersPacket,
	SmallEventInteractOtherPlayersRefuseToGivePoorPacket
} from "../../../../Lib/src/packets/smallEvents/SmallEventInteractOtherPlayers";
import {interactOtherPlayerGetPlayerDisplay} from "../../smallEvents/interactOtherPlayers";
import {SmallEventLeagueRewardPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventLeagueReward";
import {printTimeBeforeDate} from "../../../../Lib/src/utils/TimeUtils";
import {SmallEventWinGuildXPPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventWinGuildXPPacket";
import {SmallEventBonusGuildPVEIslandPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventBonusGuildPVEIslandPacket";
import {SmallEventBotFactsPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventBotFactsPacket";
import {SmallEventDoNothingPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventDoNothingPacket";
import {SmallEventFightPetPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventFightPetPacket";
import {SmallEventGobletsGamePacket} from "../../../../Lib/src/packets/smallEvents/SmallEventGobletsGamePacket";
import {SmallEventShopPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventShopPacket";
import {SmallEventStaffMemberPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventStaffMemberPacket";
import {SmallEventWinEnergyPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventWinEnergyPacket";
import {SmallEventWinFightPointsPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventWinFightPointsPacket";
import {SmallEventWinHealthPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventWinHealthPacket";
import {SmallEventWinPersonalXPPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventWinPersonalXPPacket";
import {SmallEventWitchResultPacket} from "../../../../Lib/src/packets/smallEvents/SmallEventWitchPacket";
import {RandomUtils} from "../../../../Lib/src/utils/RandomUtils";
import {witchResult} from "../../smallEvents/witch";
import {DisplayUtils} from "../../utils/DisplayUtils";
import {ItemCategory} from "../../../../Lib/src/constants/ItemConstants";

export function getRandomSmallEventIntro(language: Language): string {
	return StringUtils.getRandomTranslation("smallEvents:intro", language);
}

export default class SmallEventsHandler {
	@packetHandler(SmallEventAdvanceTimePacket)
	async smallEventAdvanceTime(socket: WebSocket, packet: SmallEventAdvanceTimePacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			const description = getRandomSmallEventIntro(interaction.userLanguage)
				+ StringUtils.getRandomTranslation("smallEvents:advanceTime.stories", interaction.userLanguage, {time: packet.amount});
			await interaction.editReply({embeds: [new DraftbotSmallEventEmbed("advanceTime", description, interaction.user, interaction.userLanguage)]});
		}
	}

	@packetHandler(SmallEventBigBadPacket)
	async smallEventBigBad(socket: WebSocket, packet: SmallEventBigBadPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			let story: string;
			switch (packet.kind) {
			case SmallEventBigBadKind.LIFE_LOSS:
				story = StringUtils.getRandomTranslation("smallEvents:bigBad.lifeLoss", interaction.userLanguage, {lifeLoss: packet.lifeLost});
				break;
			case SmallEventBigBadKind.ALTERATION:
				story = `${i18n.t(`smallEvents:bigBad.alterationStories.${packet.receivedStory}`, {lng: interaction.userLanguage})} ${DraftBotIcons.effects[packet.effectId!]}`;
				break;
			case SmallEventBigBadKind.MONEY_LOSS:
				story = StringUtils.getRandomTranslation("smallEvents:bigBad.moneyLoss", interaction.userLanguage, {moneyLost: packet.moneyLost});
				break;
			default:
				story = "";
			}

			const description = getRandomSmallEventIntro(interaction.userLanguage) + story;
			await interaction.editReply({embeds: [new DraftbotSmallEventEmbed("bigBad", description, interaction.user, interaction.userLanguage)]});
		}
	}

	@packetHandler(SmallEventBoatAdvicePacket)
	async smallEventBoatAdvice(socket: WebSocket, packet: SmallEventBoatAdvicePacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			const description = StringUtils.getRandomTranslation(
				"smallEvents:boatAdvice.intro",
				interaction.userLanguage,
				{advice: StringUtils.getRandomTranslation("smallEvents:boatAdvice.advices", interaction.userLanguage)}
			);
			await interaction.editReply({embeds: [new DraftbotSmallEventEmbed("boatAdvice", description, interaction.user, interaction.userLanguage)]});
		}
	}

	@packetHandler(SmallEventGoToPVEIslandAcceptPacket)
	async smallEventGoToPVEIslandAccept(socket: WebSocket, packet: SmallEventGoToPVEIslandAcceptPacket, context: PacketContext): Promise<void> {
		const user = (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, context.keycloakId!))!;
		const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"goToPVEIsland",
						i18n.t(
							packet.alone
								? "smallEvents:goToPVEIsland.endStoryAccept"
								: "smallEvents:goToPVEIsland.endStoryAcceptWithMember",
							{lng: user.attributes.language[0]}
						),
						interaction.user,
						user.attributes.language[0]
					)]
			});
		}
	}

	@packetHandler(SmallEventGoToPVEIslandRefusePacket)
	async smallEventGoToPVEIslandRefuse(socket: WebSocket, packet: SmallEventGoToPVEIslandRefusePacket, context: PacketContext): Promise<void> {
		const user = (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, context.keycloakId!))!;
		const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"goToPVEIsland",
						i18n.t("smallEvents:goToPVEIsland.endStoryRefuse", {lng: user.attributes.language[0]}),
						interaction.user,
						user.attributes.language[0]
					)]
			});
		}
	}

	@packetHandler(SmallEventGoToPVEIslandNotEnoughGemsPacket)
	async smallEventGoToPVEIslandNotEnoughGems(socket: WebSocket, packet: SmallEventGoToPVEIslandNotEnoughGemsPacket, context: PacketContext): Promise<void> {
		const user = (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, context.keycloakId!))!;
		const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"goToPVEIsland",
						i18n.t("smallEvents:goToPVEIsland.notEnoughGems", {lng: user.attributes.language[0]}),
						interaction.user,
						user.attributes.language[0]
					)]
			});
		}
	}

	@packetHandler(SmallEventLotteryNoAnswerPacket)
	async smallEventLotteryNoAnswer(socket: WebSocket, packet: SmallEventLotteryNoAnswerPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed("lottery", i18n.t("smallEvents:lottery.end", {lng: interaction.userLanguage}), interaction.user, interaction.userLanguage)
				]
			});
		}
	}

	@packetHandler(SmallEventLotteryPoorPacket)
	async smallEventLotteryPoor(socket: WebSocket, packet: SmallEventLotteryPoorPacket, context: PacketContext): Promise<void> {
		const user = (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, context.keycloakId!))!;
		const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"lottery",
						i18n.t("smallEvents:lottery.poor", {lng: user.attributes.language[0]}),
						interaction.user,
						user.attributes.language[0]
					)]
			});
		}
	}

	@packetHandler(SmallEventLotteryLosePacket)
	async smallEventLotteryLose(socket: WebSocket, packet: SmallEventLotteryLosePacket, context: PacketContext): Promise<void> {
		const user = (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, context.keycloakId!))!;
		const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);
		if (interaction) {
			const failKey = packet.moneyLost && packet.moneyLost > 0 ? "failWithMalus" : "fail";
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"lottery",
						i18n.t(`smallEvents:lottery.${packet.level}.${failKey}`, {
							lng: user.attributes.language[0],
							lostTime: packet.lostTime,
							money: packet.moneyLost
						}),
						interaction.user,
						user.attributes.language[0]
					)]
			});
		}
	}

	@packetHandler(SmallEventLotteryWinPacket)
	async smallEventLotteryWin(socket: WebSocket, packet: SmallEventLotteryWinPacket, context: PacketContext): Promise<void> {
		const user = (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, context.keycloakId!))!;
		const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);
		if (interaction) {
			let rewardDesc: string;
			if (packet.xp) {
				rewardDesc = i18n.t("smallEvents:lottery.rewardTypeText.xp", {
					lng: user.attributes.language[0],
					xpWon: packet.xp
				});
			}
			else if (packet.money) {
				rewardDesc = i18n.t("smallEvents:lottery.rewardTypeText.money", {
					lng: user.attributes.language[0],
					moneyWon: packet.money
				});
			}
			else if (packet.guildXp) {
				rewardDesc = i18n.t("smallEvents:lottery.rewardTypeText.guildXp", {
					lng: user.attributes.language[0],
					guildXpWon: packet.guildXp
				});
			}
			else {
				rewardDesc = i18n.t("smallEvents:lottery.rewardTypeText.points", {
					lng: user.attributes.language[0],
					pointsWon: packet.points
				});
			}

			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"lottery",
						i18n.t(`smallEvents:lottery.${packet.level}.success`, {
							lng: user.attributes.language[0],
							lostTime: packet.lostTime
						}) + rewardDesc,
						interaction.user,
						user.attributes.language[0]
					)]
			});
		}
	}

	@packetHandler(SmallEventInteractOtherPlayersPacket)
	async smallEventInteractOtherPlayers(socket: WebSocket, packet: SmallEventInteractOtherPlayersPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			if (!packet.keycloakId) {
				await interaction.editReply({
					embeds: [
						new DraftbotSmallEventEmbed(
							"interactOtherPlayers",
							StringUtils.getRandomTranslation("smallEvents:interactOtherPlayers.no_one", interaction.userLanguage),
							interaction.user,
							interaction.userLanguage
						)]
				});
			}
			else if (packet.data) {
				const playerDisplay = await interactOtherPlayerGetPlayerDisplay(packet.keycloakId, packet.data.rank, interaction.userLanguage);
				if (packet.playerInteraction === InteractOtherPlayerInteraction.EFFECT) {
					await interaction.editReply({
						embeds: [
							new DraftbotSmallEventEmbed(
								"interactOtherPlayers",
								StringUtils.getRandomTranslation(`smallEvents:interactOtherPlayers.effect.${packet.data.effectId}`, interaction.userLanguage, {playerDisplay}),
								interaction.user,
								interaction.userLanguage
							)]
					});
				}
				else {
					await interaction.editReply({
						embeds: [
							new DraftbotSmallEventEmbed(
								"interactOtherPlayers",
								StringUtils.getRandomTranslation(
									`smallEvents:interactOtherPlayers.${InteractOtherPlayerInteraction[packet.playerInteraction!].toLowerCase()}`,
									interaction.userLanguage,
									{
										playerDisplay,
										level: packet.data.level,
										class: `${DraftBotIcons.classes[packet.data.classId]} ${i18n.t(`models:classes.${packet.data.classId}`, {lng: interaction.userLanguage})}`,
										advice: StringUtils.getRandomTranslation("advices:advices", interaction.userLanguage),
										petEmote: packet.data.petId ? DraftBotIcons.pets[packet.data.petId] : "",
										petName: packet.data.petName,
										guildName: packet.data.guildName,
										weapon: DisplayUtils.getWeaponDisplay(packet.data.weaponId, interaction.userLanguage),
										armor: DisplayUtils.getArmorDisplay(packet.data.armorId, interaction.userLanguage),
										object: DisplayUtils.getObjectDisplay(packet.data.objectId, interaction.userLanguage),
										potion: DisplayUtils.getPotionDisplay(packet.data.potionId, interaction.userLanguage)
									}
								),
								interaction.user,
								interaction.userLanguage
							)]
					});
				}
			}
			else {
				throw new Error("No packet data defined in InteractOtherPlayers small event");
			}
		}
	}

	@packetHandler(SmallEventInteractOtherPlayersAcceptToGivePoorPacket)
	async smallEventInteractOtherPlayersAcceptToGivePoor(socket: WebSocket, packet: SmallEventInteractOtherPlayersAcceptToGivePoorPacket, context: PacketContext): Promise<void> {
		const user = (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, context.keycloakId!))!;
		const interaction = DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"interactOtherPlayers",
						StringUtils.getRandomTranslation("smallEvents:interactOtherPlayers.poor_give_money", user.attributes.language[0]),
						interaction.user,
						user.attributes.language[0]
					)]
			});
		}
	}

	@packetHandler(SmallEventInteractOtherPlayersRefuseToGivePoorPacket)
	async smallEventInteractOtherPlayersRefuseToGivePoor(socket: WebSocket, packet: SmallEventInteractOtherPlayersRefuseToGivePoorPacket, context: PacketContext): Promise<void> {
		const user = (await KeycloakUtils.getUserByKeycloakId(keycloakConfig, context.keycloakId!))!;
		const interaction = context.discord!.buttonInteraction ? DiscordCache.getButtonInteraction(context.discord!.buttonInteraction!) : DiscordCache.getInteraction(context.discord!.interaction!);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"interactOtherPlayers",
						StringUtils.getRandomTranslation("smallEvents:interactOtherPlayers.poor_dont_give_money", user.attributes.language[0]),
						interaction.user,
						user.attributes.language[0]
					)]
			});
		}
	}

	@packetHandler(SmallEventLeagueRewardPacket)
	async smallEventLeagueReward(socket: WebSocket, packet: SmallEventLeagueRewardPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			let endMessage;
			if (packet.rewardToday) {
				endMessage = i18n.t("smallEvents:leagueReward.rewardToday", {lng: interaction.userLanguage});
			}
			else {
				endMessage = i18n.t(packet.enoughFights ? "smallEvents:leagueReward.endMessage" : "smallEvents:leagueReward.notEnoughFight", {
					lng: interaction.userLanguage,
					interpolation: { escapeValue: false },
					league: i18n.t(`models:leagues.${packet.leagueId}`, {lng: interaction.userLanguage}),
					rewards: i18n.t("smallEvents:leagueReward.reward", {lng: interaction.userLanguage, money: packet.money, xp: packet.xp}),
					time: printTimeBeforeDate(packet.nextRewardDate)
				});
			}

			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"leagueReward",
						getRandomSmallEventIntro(interaction.userLanguage) + StringUtils.getRandomTranslation("smallEvents:leagueReward.intrigue", interaction.userLanguage) + endMessage,
						interaction.user,
						interaction.userLanguage
					)
				]
			});
		}
	}

	@packetHandler(SmallEventWinGuildXPPacket)
	async smallEventWinGuildXp(socket: WebSocket, packet: SmallEventWinGuildXPPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"winGuildXP",
						StringUtils.getRandomTranslation("smallEvents:winGuildXP.stories", interaction.userLanguage, { guild: packet.guildName })
						+ i18n.t("smallEvents:winGuildXP.end", {lng: interaction.userLanguage, xp: packet.amount}),
						interaction.user,
						interaction.userLanguage
					)
				]
			});
		}
	}

	@packetHandler(SmallEventBonusGuildPVEIslandPacket)
	async smallEventBonusGuildPVEIsland(socket: WebSocket, packet: SmallEventBonusGuildPVEIslandPacket, context: PacketContext): Promise<void> {
		// Todo
	}

	@packetHandler(SmallEventBotFactsPacket)
	async smallEventBotFacts(socket: WebSocket, packet: SmallEventBotFactsPacket, context: PacketContext): Promise<void> {
		// Todo
	}

	@packetHandler(SmallEventDoNothingPacket)
	async smallEventDoNothing(socket: WebSocket, packet: SmallEventDoNothingPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"doNothing",
						StringUtils.getRandomTranslation("smallEvents:doNothing.stories", interaction.userLanguage),
						interaction.user,
						interaction.userLanguage
					)
				]
			});
		}
	}

	@packetHandler(SmallEventFightPetPacket)
	async smallEventFightPet(socket: WebSocket, packet: SmallEventFightPetPacket, context: PacketContext): Promise<void> {
		// Todo
	}

	@packetHandler(SmallEventGobletsGamePacket)
	async smallEventGobletsGame(socket: WebSocket, packet: SmallEventGobletsGamePacket, context: PacketContext): Promise<void> {
		// Todo
	}

	@packetHandler(SmallEventShopPacket)
	async smallEventShop(socket: WebSocket, packet: SmallEventShopPacket, context: PacketContext): Promise<void> {
		// Todo
	}

	@packetHandler(SmallEventStaffMemberPacket)
	async smallEventStaffMember(socket: WebSocket, packet: SmallEventStaffMemberPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			const staffMember = RandomUtils.draftbotRandom.pick(Object.keys(i18n.t("smallEvents:staffMember.members", {returnObjects: true, lng: interaction.userLanguage})));
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"staffMember",
						getRandomSmallEventIntro(interaction.userLanguage)
						+ StringUtils.getRandomTranslation("smallEvents:staffMember.context", interaction.userLanguage, {
							pseudo: staffMember,
							sentence: i18n.t(`smallEvents:staffMember.members.${staffMember}`, {
								lng: interaction.userLanguage,
								interpolation: { escapeValue: false }
							})
						}),
						interaction.user,
						interaction.userLanguage
					)
				]
			});
		}
	}

	@packetHandler(SmallEventWinEnergyPacket)
	async smallEventWinEnergy(socket: WebSocket, packet: SmallEventWinEnergyPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"winEnergy",
						getRandomSmallEventIntro(interaction.userLanguage) + StringUtils.getRandomTranslation("smallEvents:winEnergy.stories", interaction.userLanguage),
						interaction.user,
						interaction.userLanguage
					)
				]
			});
		}
	}

	@packetHandler(SmallEventWinFightPointsPacket)
	async smallEventWinFightPoints(socket: WebSocket, packet: SmallEventWinFightPointsPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"winFightPoints",
						getRandomSmallEventIntro(interaction.userLanguage)
						+ StringUtils.getRandomTranslation("smallEvents:winFightPoints.stories", interaction.userLanguage, { fightPoints: packet.amount }),
						interaction.user,
						interaction.userLanguage
					)
				]
			});
		}
	}

	@packetHandler(SmallEventWinHealthPacket)
	async smallEventWinHealth(socket: WebSocket, packet: SmallEventWinHealthPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"winHealth",
						getRandomSmallEventIntro(interaction.userLanguage)
						+ StringUtils.getRandomTranslation("smallEvents:winHealth.stories", interaction.userLanguage, { health: packet.amount }),
						interaction.user,
						interaction.userLanguage
					)
				]
			});
		}
	}

	@packetHandler(SmallEventWinPersonalXPPacket)
	async smallEventWinPersonalXP(socket: WebSocket, packet: SmallEventWinPersonalXPPacket, context: PacketContext): Promise<void> {
		const interaction = DiscordCache.getInteraction(context.discord!.interaction);
		if (interaction) {
			await interaction.editReply({
				embeds: [
					new DraftbotSmallEventEmbed(
						"winPersonalXP",
						getRandomSmallEventIntro(interaction.userLanguage)
						+ StringUtils.getRandomTranslation("smallEvents:winPersonalXP.stories", interaction.userLanguage)
						+ i18n.t("smallEvents:winPersonalXP.end", {lng: interaction.userLanguage, xp: packet.amount}),
						interaction.user,
						interaction.userLanguage
					)
				]
			});
		}
	}

	@packetHandler(SmallEventWitchResultPacket)
	async smallEventWitchResult(socket: WebSocket, packet: SmallEventWitchResultPacket, context: PacketContext): Promise<void> {
		await witchResult(socket, packet, context);
	}
}