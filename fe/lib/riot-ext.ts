import {collectValues, refNodes, refs} from "./utils";


export function refsPlugin(component): void {

    component.refs = (from?: Element | string): HTMLInputElement[] => {
        from = from || component.root
        if (typeof from === "string")
            from = component.$(from)
        return refs(<Element>from)
    }
    component.refNodes = (from?: Element | string): { [name: string]: HTMLInputElement } => {
        from = from || component.root
        if (typeof from === "string")
            from = component.$(from)
        return refNodes(<Element>from)
    }

    component.collectValues = (from?: Element | string): { [k: string]: any } => {
        if (typeof from === "string")
            from = component.$(from)
        return collectValues(from || component.root, component)
    }
    component.getFieldAndValue = function (event): { field: string, value } {
        let target = event.target;
        if (!target.getAttribute('ref'))
            target = target.parentNode
        let field = target.getAttribute('ref')
        const value = target.value
        return {field, value};
    }
}
