import { SimpleType, toTypeString } from "ts-simple-type";
import { HtmlNodeAttr } from "../../../analyze/types/html-node/html-node-attr-types";
import { RuleModuleContext } from "../../../analyze/types/rule/rule-module-context";
import { isLitDirective } from "../directive/is-lit-directive";
import { rangeFromHtmlNodeAttr } from "../../../analyze/util/range-util";

/**
 * If the user's security policy overrides normal type checking for this
 * attribute binding, returns a (possibly empty) array of diagnostics.
 *
 * If the security policy does not apply to this binding, then
 */
export function isAssignableBindingUnderSecuritySystem(
	htmlAttr: HtmlNodeAttr,
	{ typeA, typeB }: { typeA: SimpleType; typeB: SimpleType },
	context: RuleModuleContext
): boolean | undefined {
	const securityPolicy = context.config.securitySystem;
	switch (securityPolicy) {
		case "off":
			return undefined; // No security checks apply.
		case "ClosureSafeTypes":
			return checkClosureSecurityAssignability(typeB, htmlAttr, context);
		default: {
			const never: never = securityPolicy;
			context.logger.error(`Unexpected security policy: ${never}`);
			return undefined;
		}
	}
}

interface TagNameToSecurityOverrideMap {
	[tagName: string]: SecurityOverrideMap | undefined;
}

// A map from attribute/property names to an array of type names.
// Assignments to the given attribute must match one of the given types.
interface SecurityOverrideMap {
	[attributeName: string]: string[] | undefined;
}

const closureScopedOverrides: TagNameToSecurityOverrideMap = {
	iframe: {
		src: ["TrustedResourceUrl"]
	},
	a: {
		href: ["TrustedResourceUrl", "SafeUrl", "string"]
	},
	img: {
		src: ["TrustedResourceUrl", "SafeUrl", "string"]
	},
	script: {
		src: ["TrustedResourceUrl"]
	}
};
const closureGlobalOverrides: SecurityOverrideMap = {
	style: ["SafeStyle", "string"]
};

function checkClosureSecurityAssignability(typeB: SimpleType, htmlAttr: HtmlNodeAttr, context: RuleModuleContext): boolean | undefined {
	const scopedOverride = closureScopedOverrides[htmlAttr.htmlNode.tagName];
	const overriddenTypes = (scopedOverride && scopedOverride[htmlAttr.name]) || closureGlobalOverrides[htmlAttr.name];
	if (overriddenTypes === undefined) {
		return undefined;
	}
	// Directives are responsible for their own security.
	if (isLitDirective(typeB)) {
		return undefined;
	}

	const typeMatch = matchesAtLeastOneNominalType(overriddenTypes, typeB);
	if (typeMatch === false) {
		/*const nominalType: SimpleType = {
			kind: SimpleTypeKind.INTERFACE,
			members: [],
			name: "A security type"
		};*/

		context.report({
			location: rangeFromHtmlNodeAttr(htmlAttr),
			message: `Type '${toTypeString(typeB)}' is not assignable to '${overriddenTypes.join(" | ")}'. This is due to Closure Safe Type enforcement.`
		});
		return false;
	}

	return true;
}

function matchesAtLeastOneNominalType(typeNames: string[], typeB: SimpleType): boolean {
	if (typeB.name !== undefined && typeNames.includes(typeB.name)) {
		return true;
	}
	switch (typeB.kind) {
		case "UNION":
			return typeB.types.every(t => matchesAtLeastOneNominalType(typeNames, t));
		case "STRING_LITERAL":
		case "STRING":
			return typeNames.includes("string");
		case "GENERIC_ARGUMENTS":
			return matchesAtLeastOneNominalType(typeNames, typeB.target);
		default:
			return false;
	}
}
