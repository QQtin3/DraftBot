import {discordConfig, draftBotClient, shardId} from "./DraftBotShard";
import {PacketListenerClient} from "../../../Lib/src/packets/PacketListener";
import {registerAllPacketHandlers} from "../packetHandlers/PacketHandler";
import {DraftBotPacket, makePacket, PacketContext} from "../../../Lib/src/packets/DraftBotPacket";
import {ErrorPacket} from "../../../Lib/src/packets/commands/ErrorPacket";
import {connect, MqttClient} from "mqtt";
import {MqttConstants} from "../../../Lib/src/constants/MqttConstants";
import {DiscordAnnouncement} from "../announcements/DiscordAnnouncement";
import {NotificationsHandler} from "../notifications/NotificationsHandler";
import {NotificationsSerializedPacket} from "../../../Lib/src/packets/notifications/NotificationsSerializedPacket";
import {LANGUAGE} from "../../../Lib/src/Language";
import {TextChannel} from "discord.js";
import {DraftBotEmbed} from "../messages/DraftBotEmbed";
import i18n from "../translations/i18n";
import {MqttTopicUtils} from "../../../Lib/src/utils/MqttTopicUtils";

export class DiscordMQTT {
	static mqttClient: MqttClient;

	static notificationMqttClient: MqttClient;

	static packetListener: PacketListenerClient = new PacketListenerClient();

	static async init(isMainShard: boolean): Promise<void> {
		await registerAllPacketHandlers();

		this.connectAndSubscribeGlobal();

		if (isMainShard) {
			this.connectSubscribeAndHandleNotifications();
		}

		this.handleGlobalMqttMessage();
	}

	private static handleGlobalMqttMessage(): void {
		DiscordMQTT.mqttClient.on("message", async (topic, message) => {
			if (topic === MqttTopicUtils.getDiscordTopic(discordConfig.PREFIX)) {
				const messageString = message.toString();
				console.log(`Received message from topic ${topic}: ${messageString}`);
				const dataJson = JSON.parse(messageString);
				if (!Object.hasOwn(dataJson, "packets") || !Object.hasOwn(dataJson, "context")) {
					console.log(`Wrong packet format : ${messageString}`);
					return;
				}

				const context = dataJson.context as PacketContext;

				if (context.discord!.shardId !== shardId) {
					return;
				}

				try {
					for (const packet of dataJson.packets) {
						let listener = DiscordMQTT.packetListener.getListener(packet.name);
						if (!listener) {
							packet.packet = makePacket(ErrorPacket, {message: `No packet listener found for received packet '${packet.name}'.\n\nData:\n${JSON.stringify(packet.packet)}`});
							listener = DiscordMQTT.packetListener.getListener("ErrorPacket")!;
						}
						await listener(context as PacketContext, packet.packet as DraftBotPacket);
					}
				}
				catch (error) {
					console.error(`Error while handling packet: ${error}`);

					const context = dataJson.context as PacketContext;
					const lng = context.discord?.language ?? LANGUAGE.ENGLISH;
					if (context.discord?.channel) {
						const channel = await draftBotClient.channels.fetch(context.discord.channel);
						if (channel instanceof TextChannel) {
							await channel.send({ embeds: [
								new DraftBotEmbed()
									.setErrorColor()
									.setTitle(i18n.t("error:errorOccurredTitle", {lng}))
									.setDescription(i18n.t("error:errorOccurred", {lng}))
							]});
						}
					}
				}
			}
			else if (topic === MqttTopicUtils.getDiscordTopWeekAnnouncementTopic(discordConfig.PREFIX)) {
				if (message.toString() === "") {
					console.log("No top week announcement in the MQTT topic");
					return;
				}

				if (await DiscordAnnouncement.canAnnounce()) {
					await DiscordAnnouncement.announceTopWeek(JSON.parse(message.toString()));

					// Clear the announcement so it doesn't get processed again
					DiscordMQTT.mqttClient.publish(MqttTopicUtils.getDiscordTopWeekAnnouncementTopic(discordConfig.PREFIX), "", {retain: true});
				}
			}
			else if (topic === MqttTopicUtils.getDiscordTopWeekFightAnnouncementTopic(discordConfig.PREFIX)) {
				if (message.toString() === "") {
					console.log("No top week fight announcement in the MQTT topic");
					return;
				}

				if (await DiscordAnnouncement.canAnnounce()) {
					await DiscordAnnouncement.announceTopWeekFight(JSON.parse(message.toString()));

					// Clear the announcement so it doesn't get processed again
					DiscordMQTT.mqttClient.publish(MqttTopicUtils.getDiscordTopWeekFightAnnouncementTopic(discordConfig.PREFIX), "", {retain: true});
				}
			}
		});
	}

	private static subscribeTo(mqttClient: MqttClient, topic: string): void {
		mqttClient.subscribe(topic, err => {
			if (err) {
				console.error(err);
				process.exit(1);
			}
			else {
				console.log(`Subscribed to topic ${topic}`);
			}
		});
	}

	private static connectSubscribeAndHandleNotifications(): void {
		DiscordMQTT.notificationMqttClient = connect(discordConfig.MQTT_HOST, {
			connectTimeout: MqttConstants.CONNECTION_TIMEOUT,
			clientId: MqttTopicUtils.getNotificationsConsumerTopic(discordConfig.PREFIX),
			clean: false // Keeps session active even if the client goes offline
		});

		DiscordMQTT.notificationMqttClient.on("connect", () => {
			DiscordMQTT.notificationMqttClient.publish(MqttTopicUtils.getNotificationsTopic(discordConfig.PREFIX), "", {retain: true}); // Clear the last notification to avoid processing it twice

			DiscordMQTT.subscribeTo(DiscordMQTT.notificationMqttClient, MqttTopicUtils.getNotificationsTopic(discordConfig.PREFIX));
		});

		DiscordMQTT.notificationMqttClient.on("message", (topic, message) => {
			if (topic === MqttTopicUtils.getNotificationsTopic(discordConfig.PREFIX)) {
				if (message.toString() === "") {
					return;
				}

				const messageString = message.toString();
				console.log(`Received notification message from topic ${topic}: ${messageString}`);

				const serializedPacket: NotificationsSerializedPacket = JSON.parse(messageString);
				NotificationsHandler.sendNotifications(serializedPacket);
			}
		});
	}

	private static connectAndSubscribeGlobal(): void {
		DiscordMQTT.mqttClient = connect(discordConfig.MQTT_HOST, {
			connectTimeout: MqttConstants.CONNECTION_TIMEOUT
		});

		DiscordMQTT.mqttClient.on("connect", () => {
			DiscordMQTT.subscribeTo(DiscordMQTT.mqttClient, MqttTopicUtils.getDiscordTopic(discordConfig.PREFIX));
			DiscordMQTT.subscribeTo(DiscordMQTT.mqttClient, MqttTopicUtils.getDiscordTopWeekAnnouncementTopic(discordConfig.PREFIX));
			DiscordMQTT.subscribeTo(DiscordMQTT.mqttClient, MqttTopicUtils.getDiscordTopWeekFightAnnouncementTopic(discordConfig.PREFIX));
		});
	}
}

