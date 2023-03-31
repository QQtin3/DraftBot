import {EmbedField} from "discord.js";
import {Translations} from "../../../Translations";
import {Model} from "sequelize";
import {draftBotClient} from "../../../bot";
import {Constants} from "../../../Constants";

export type MaxStatsValues = { attack: number, defense: number, speed: number }

export abstract class GenericItemModel extends Model {
	public readonly id!: number;

	public readonly rarity!: number;

	public readonly fr!: string;

	public readonly en!: string;

	public readonly emote!: string;

	public readonly fallbackEmote: string;

	public readonly frenchMasculine!: boolean;

	public readonly frenchPlural!: boolean;

	public updatedAt!: Date;

	public createdAt!: Date;

	abstract categoryName: string;

	public slot: number;

	public abstract toString(language: string, maxStatsValue: MaxStatsValues): string;

	public getRarityTranslation(language: string): string {
		return Translations.getModule("items", language).getFromArray("rarities", this.rarity);
	}

	public getName(language: string): string {
		return Translations.getModule("items", language).format("nameDisplay", {
			emote: "🐟",
			name: language === Constants.LANGUAGE.FRENCH ? "Poisson" : "Fish"
		});
	}

	public getSimpleName(language: string): string {
		return language === Constants.LANGUAGE.FRENCH ? "Poisson" : "Fish";
	}

	public getEmote(): string {
		return "🐟";
	}

	public abstract getAttack(): number;

	public abstract getDefense(): number;

	public abstract getSpeed(): number;

	public abstract getCategory(): number;

	public abstract getItemAddedValue(): number;

	public abstract toFieldObject(language: string, maxStatsValue: MaxStatsValues): EmbedField;
}