
import * as Expression from '../../mol-script/language/expression';
import { StructureSelection, QueryContext, StructureProperties } from '../../mol-model/structure';
import { compile } from '../../mol-script/runtime/query/compiler';
import { Queries } from '../../mol-model/structure';
import { Location } from '../../mol-model/structure/structure/element/location';
import { Loci } from '../../mol-model/loci';
import { OrderedSet } from '../../mol-data/int';
import { StructureQuery } from '../../mol-model/structure/query/query';

// Assuming Location and Loci are defined elsewhere
// and StructureProperties are functions that take a Location and return a value

export function getLocationArray(loci: Loci): Location[] {
    if (Loci.isEmpty(loci)) return [];

    const locationArray: Location[] = [];
    const location = Location.create(loci.structure);

    for (const e of loci.elements) {
        const { unit, indices } = e;
        location.unit = unit;
        const { elements } = e.unit;

        for (let i = 0, _i = OrderedSet.size(indices); i < _i; i++) {
            location.element = elements[OrderedSet.getAt(indices, i)];
            locationArray.push(Location.clone(location)); // Assuming Location.clone exists
        }
    }

    return locationArray;
}

export const locationAttrs: { [key: string]: (loc: Location) => any } = {
    // 'entity_id': StructureProperties.entity.id,
    'auth_asym_id': StructureProperties.chain.auth_asym_id,
    'label_asym_id': StructureProperties.chain.label_asym_id,
    'auth_comp_id': StructureProperties.atom.auth_comp_id,
    'label_comp_id': StructureProperties.atom.label_comp_id,
    'auth_seq_id': StructureProperties.residue.auth_seq_id,
    'label_seq_id': StructureProperties.residue.label_seq_id,
    'auth_atom_id': StructureProperties.atom.auth_atom_id,
    // 'id': StructureProperties.atom.id,
};
export function queryFromLoci(loci: Loci): SelectionQuery {
    const locations = getLocationArray(loci);
    const selections = locations.map((loc: Location) => {
        const result: Selection = {};
        for (const key in locationAttrs) {
            if (Object.hasOwnProperty.call(locationAttrs, key)) {
                const func = locationAttrs[key];
                // Now using an array of Condition objects for the "ops" field
                result[key] = { ops: [{ op: '==', value: func(loc) }] };
            }
        }
        return result;
    });

    return {
        selections,
        params: { auth_label_pref: 'auth', refId: '' }
    };
}

export class RefMap {
    molstarToExternal: { [key: string]: string } = {};
    externalToMolstar: { [value: string]: string } = {};
    refObjectStorage: {[key: string]: Ref } = {};


    addRef(ref: Ref): boolean {
        const molstarRefId = ref.molstarRefId;
        const externalRefId = ref.externalRefId;
        if (this.molstarToExternal.hasOwnProperty(molstarRefId) || this.externalToMolstar.hasOwnProperty(externalRefId)) {
            return false;
        }
        this.molstarToExternal[molstarRefId] = externalRefId;
        this.externalToMolstar[externalRefId] = molstarRefId;
        this.refObjectStorage[molstarRefId] = ref;
        return true;
    }

    hasRefId(value: string): boolean {
        return (this.molstarToExternal.hasOwnProperty(value) || this.externalToMolstar.hasOwnProperty(value));
    }

    retrieveRefId(refIdAny: string): string | null { // returns the molstar ref id for either input
        if (this.molstarToExternal.hasOwnProperty(refIdAny)) {
            return refIdAny;
        } else if (this.externalToMolstar.hasOwnProperty(refIdAny)) {
            return this.externalToMolstar[refIdAny];
        } else {
            throw new Error('refID not present in mapping');
        }
    }
    retrieveRef(refIdAny: string): Ref { // returns the molstar ref id for either input
        const refMolstar = this.retrieveRefId(refIdAny);
        return this.refObjectStorage[refMolstar];
    }
    summarize() {
        return JSON.stringify(this.molstarToExternal);
    }
};

export type Ref = {
    molstarRefId: string,
    externalRefId: string,
    // structure: any;
    style: StyleQuery;
    // styleHistory: StyleQuery[];
};

export interface stringDictionary {
    [key: string]: any;
}

type Operator = '==' | '>=' | '<=' | '>' | '<';

type Condition = {
    op: Operator;
    value: string | number | boolean; // Adjust as necessary
};

type KeywordConditions = {
    ops: Condition[];
};

export type Selection = {
    [keyword: string]: KeywordConditions;
};

export type SelectionQuery = {
    selections: Selection[],
    params: {
        auth_label_pref: 'auth' | 'label' | undefined,
        refId: string
    },
    // // Move to style
    // color?: any,
    // sideChain?: boolean,
    // representation?: string,
    // representationColor?: any,
    // focus?: boolean,
    // nonSelectedColor?: any;
    // colorTheme: ColorTheme.BuiltIn;
};

// export const allSelection: Selection = { 'entity_id': { 'ops': [{ 'op': '==', 'value': '*' }] }, 'asym_id': { 'ops': [{ 'op': '==', 'value': '*' }] }, 'comp_id': { 'ops': [{ 'op': '==', 'value': '*' }] }, 'seq_id': { 'ops': [{ 'op': '==', 'value': '*' }, { 'op': '==', 'value': '*' }] }, 'atom_id': { 'ops': [{ 'op': '==', 'value': '*' }] } };
export const allSelection: Selection = { 'asym_id': { 'ops': [{ 'op': '==', 'value': '*' }] }, 'comp_id': { 'ops': [{ 'op': '==', 'value': '*' }] }, 'seq_id': { 'ops': [{ 'op': '==', 'value': '*' }, { 'op': '==', 'value': '*' }] }, 'atom_id': { 'ops': [{ 'op': '==', 'value': '*' }] } };

export const allSelectionQuery: SelectionQuery = {
    selections: [allSelection],
    params: {
        auth_label_pref: 'auth',
        refId: ''
    }
};
export const debugQuery: SelectionQuery = {
    selections: [
        {
            'seq_id': {
                ops: [
                    { op: '==', value: 4 }
                ]
            },
            // Add more keywords and conditions here
        }
    ],
    params: {
        auth_label_pref: 'auth',
        refId: '88'
    }
};


type RepresentationString = 'ball-and-stick' | 'cartoon';
export type StyleQuery = {
    refId: string,
    query: SelectionQuery,
    color: string,
    representation: RepresentationString[],
    focus: boolean,
    visible: boolean,
};

export const DefaultStyle: StyleQuery = {
    refId: '',
    query: allSelectionQuery,
    color: '#ff2a31',
    representation: ['ball-and-stick', 'cartoon'],
    focus: false,
    visible: true,
};

export namespace QueryHelper {

    // Mapping function to get the correct function from StructureProperties
    function getStructurePropertyFunction(keyword: string, authLabelPref: string): any {
        const mapping: any = {
            // 'entity_id': authLabelPref === 'auth' ? 'entity.id' : 'entity.id',
            'asym_id': authLabelPref === 'auth' ? 'chain.auth_asym_id' : 'chain.label_asym_id',
            'seq_id': authLabelPref === 'auth' ? 'residue.auth_seq_id' : 'residue.label_seq_id',
            'comp_id': authLabelPref === 'auth' ? 'residue.auth_comp_id' : 'residue.label_comp_id',
            'atom_id': authLabelPref === 'auth' ? 'atom.auth_atom_id' : 'atom.label_atom_id',
            // 'id': authLabelPref === 'auth' ? 'atom.id' : 'atom.id',
            // add more here maybe...
        };
        // Check if the keyword exists in mapping
        if (!mapping[keyword]) {
            console.error(`Keyword '${keyword}' not in mapping`);
            return null;
        }
        const mapped = mapping[keyword].split('.');

        // Check if StructureProperties exists
        if (!StructureProperties) {
            console.error('StructureProperties is undefined');
            return null;
        }

        // Check if the first part of the path exists
        if (!StructureProperties[mapped[0]]) {
            console.error(`StructureProperties[${mapped[0]}] is undefined`);
            return null;
        }

        // Check if the function exists
        if (typeof StructureProperties[mapped[0]][mapped[1]] !== 'function') {
            console.error(`StructureProperties[${mapped[0]}][${mapped[1]}] is not a function`);
            return null;
        }

        return StructureProperties[mapped[0]][mapped[1]];
    }
    function mapKeywordToTestName(keyword: string): string {
        const mapping: any = {
            // 'entity_id': 'entity',
            'asym_id': 'chain',
            'seq_id': 'residue',
            'comp_id': 'residue',
            'atom_id': 'atom',
            // 'id':'atom',
        };
        return mapping[keyword] || keyword;
    }


    // New function that prefers label
    export function getMolstarQuery(query: SelectionQuery, contextData: any): Expression.Expression {
        // console.log('query:');
        // console.log(JSON.stringify(query));
        const selections: any = [];

        query.selections.forEach(param => {
            const selection: any = {};

            Object.keys(param).forEach(keyword => {
                const conditions = param[keyword].ops;
                // Map keyword to test name
                const testName = mapKeywordToTestName(keyword);

                selection[`${testName}Test`] = (l: any) => {
                    return conditions.every(cond => {
                        const operator = cond.op;
                        const value = cond.value;

                        // Handle wildcard
                        if (value === '*') {
                            return true;
                        }
                        // console.log(keyword);
                        // console.log(query.params.auth_label_pref);
                        const structureFunction = getStructurePropertyFunction(keyword, query.params.auth_label_pref);
                        // console.log(structureFunction);
                        const elementValue = structureFunction(l.element);
                        // console.log('Function:', structureFunction);
                        // console.log('Operator:', operator);
                        // console.log('Value:', value);
                        // console.log('elementValue:', elementValue);
                        switch (operator) {
                            case '==':
                                return elementValue === value;
                            case '>=':
                                return elementValue >= value;
                            case '<=':
                                return elementValue <= value;
                            default:
                                return false;
                        }
                    });
                };
            });
            // console.log('Current selection:', selection); // debug
            selections.push(selection);
        });

        const atmGroupsQueries: any[] = [];
        selections.forEach((selection: any) => {
            atmGroupsQueries.push(Queries.generators.atoms(selection));
        });

        return Queries.combinators.merge(atmGroupsQueries);
    }


    export function getSelFromQuery(query: SelectionQuery, contextData: any) {
        const sel = StructureQuery.run(QueryHelper.getMolstarQuery(query, contextData) as any, contextData);
        return sel;

    }

    export function getInteractivityLoci(param: SelectionQuery, contextData: any) {
        // const sel = StructureQuery.run(QueryHelper.getQueryObject(param, contextData) as any, contextData);
        const sel = StructureQuery.run(QueryHelper.getMolstarQuery(param, contextData) as any, contextData);
        return StructureSelection.toLociWithSourceUnits(sel);
    }

}