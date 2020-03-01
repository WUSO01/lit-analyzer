import { isHtmlEvent, isHtmlMember } from "../../../parse/parse-html-data/html-tag";
import { HtmlNodeAttr } from "../../../types/html-node/html-node-attr-types";
import { LitAnalyzerContext } from "../../../lit-analyzer-context";
import { DefinitionKind, LitDefinition } from "../../../types/lit-definition";
import { rangeFromHtmlNodeAttr } from "../../../util/range-util";

export function definitionForHtmlAttr(htmlAttr: HtmlNodeAttr, { htmlStore }: LitAnalyzerContext): LitDefinition | undefined {
	const target = htmlStore.getHtmlAttrTarget(htmlAttr);
	if (target == null) return undefined;

	if (isHtmlMember(target) && target.declaration != null) {
		return {
			kind: DefinitionKind.MEMBER,
			fromRange: rangeFromHtmlNodeAttr(htmlAttr),
			target: target.declaration
		};
	} else if (isHtmlEvent(target) && target.declaration != null) {
		return {
			kind: DefinitionKind.EVENT,
			fromRange: rangeFromHtmlNodeAttr(htmlAttr),
			target: target.declaration
		};
	}
	return;
}
