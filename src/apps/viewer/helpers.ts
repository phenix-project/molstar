
import * as Expression from '../../mol-script/language/expression';
import { StructureSelection, StructureProperties } from '../../mol-model/structure';
import { Queries } from '../../mol-model/structure';
import { Location } from '../../mol-model/structure/structure/element/location';
import { Loci } from '../../mol-model/loci';
import { OrderedSet } from '../../mol-data/int';
import { StructureQuery } from '../../mol-model/structure/query/query';
//import { StructureComponent, StructureFromModel, TrajectoryFromMmCif, TrajectoryFromPDB, TransformStructureConformation } from '../../mol-plugin-state/transforms/model';
import { MolScriptBuilder as MS } from '../../mol-script/language/builder';
import {  StructureSelectionQuery } from '../../mol-plugin-state/helpers/structure-selection-query'
// Assuming Location and Loci are defined elsewhere
// and StructureProperties are functions that take a Location and return a value

export function getLocationArray(loci: any): Location[] {
    // V2 Function
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
    //'entity_id': StructureProperties.entity.id,
    'auth_asym_id': StructureProperties.chain.auth_asym_id,
    'label_asym_id': StructureProperties.chain.label_asym_id,

    'auth_comp_id': StructureProperties.atom.auth_comp_id,
    'label_comp_id': StructureProperties.atom.label_comp_id,

    'auth_seq_id': StructureProperties.residue.auth_seq_id,
    'label_seq_id': StructureProperties.residue.label_seq_id,

    'auth_atom_id': StructureProperties.atom.auth_atom_id,
    'label_atom_id': StructureProperties.atom.label_atom_id,

    'label_alt_id': StructureProperties.atom.label_alt_id,
    'id': StructureProperties.atom.id,
};

export function phenixSelFromLoci(loci: Loci): any {
    const locations = getLocationArray(loci);
    const result = locations.map((loc: Location) => {
      const obj: { [key: string]: any } = {};
      for (const key in locationAttrs) {
        if (locationAttrs.hasOwnProperty(key)) {
          const func = locationAttrs[key];
          obj[key] = func(loc);
        }
      }
      return obj;
    });
    return result
}
  

export function queryFromLoci(this:any, loci: Loci): SelectionQuery {
    // deprecate
    const locations = getLocationArray(loci);
    const selections = locations.map((loc: Location) => {
        const result: any = {};
        for (const key in locationAttrs) {
            if (Object.hasOwnProperty.call(locationAttrs, key)) {
                const func = locationAttrs[key];
                result[key] = func(loc);
            }
        }
        // result["id_molstar_structure"] = this.structureMapping.getByValue(loc.structure)
        return result;
    });

    return {
        selections,
        params: { refId: '' }
    };
}

// 'Dataclasses'
export interface PhenixState {
  references:  PhenixReference[]
  has_synced: false | boolean;
}

export class PhenixStateClass implements PhenixState {
  references: PhenixReference[] = []
  has_synced: false | boolean = false;

  constructor() {
  }

  hasPhenixReferenceKey(phenixReferenceKey: string): boolean {
    for (const reference of this.references) {
      if (reference.phenixKey === phenixReferenceKey) {
        return true;
      }
    }
    return false;
  }
}


export interface PhenixReference {
  molstarKey: string | boolean;
  phenixKey: string | boolean;
  structures: PhenixStructure[]
}

export class PhenixReferenceClass implements PhenixReference {
  molstarKey: "" | string = "";
  phenixKey: "" | string = "";
  structures: PhenixStructure[] = [];

  constructor(phenixKey: string, molstarKey: string) {
    this.phenixKey = phenixKey;
    this.molstarKey= molstarKey;
  }
  hasPhenixStructureKey(phenixStructureKey: string): boolean {
    for (const structure of this.structures) {
      if (structure.phenixKey === phenixStructureKey) {
        return true;
      }
    }
    return false;
  }
  getStructureKey() {
    if (this.structures.length !== 1) {
        throw new Error(`Expected structures array for ref ${this.phenixKey} to be size 1, but got ${this.structures.length}`);
    }
    const phenixStructureKey = this.structures[0].phenixKey
    return phenixStructureKey
}
}


// Define PhenixStructure interface
export interface PhenixStructure {
    phenixReferenceKey: string | undefined;
    phenixKey: string | undefined;
    data_id: string | undefined;
    key: string | undefined;
    molstarKey: string | undefined;
    components: PhenixComponent[];
  }
  
  // Implement PhenixStructureClass
  export class PhenixStructureClass implements PhenixStructure {
    phenixReferenceKey: string | undefined;
    phenixKey: string | undefined = "";
    data_id: string | undefined = "";
    key: string | undefined = "";
    molstarKey: string | undefined = "";
    components: PhenixComponent[] = [];
  
    constructor(phenixReferenceKey:string, phenixKey: string,data_id: string | undefined, molstarKey: string | undefined) {
      this.phenixReferenceKey  = phenixReferenceKey;
      this.phenixKey = phenixKey;
      this.data_id = data_id;
      this.molstarKey = molstarKey;
    }
    hasPhenixComponentKey(phenixComponentKey: string): boolean {
        for (const component of this.components) {
          if (component.phenixKey === phenixComponentKey) {
            return true;
          }
        }
        return false;
      }
    }

export interface PhenixComponent {
  phenixKey: string | undefined;
  molstarKey: string | undefined;
  key: string | boolean;
  representations: PhenixRepresentation[];
}
export class PhenixComponentClass implements PhenixComponent {
  phenixKey: "" | string = "";
  molstarKey: "" | string = "";
  key: "" | string = "";
  representations: PhenixRepresentation[] = [];

  constructor(phenixKey: string, molstarKey: string) {
    this.phenixKey = phenixKey;
    this.molstarKey = molstarKey
  }
  hasPhenixRepresentationKey(phenixRepresentationKey: string): boolean {
    for (const representation of this.representations) {
      if (representation.phenixKey === phenixRepresentationKey) {
        return true;
      }
    }
    return false;
  }
}

export interface PhenixRepresentation {
    phenixKey: string | boolean;
    molstarKey: string | undefined;
    name: string | boolean;
  }
  export class PhenixRepresentationClass implements PhenixRepresentation {
    phenixKey: "" | string = "";
    molstarKey: "" | string = "";
    name: "" | string = "";
  
    constructor(phenixKey: string, molstarKey: string) {
      this.phenixKey = phenixKey;
      this.molstarKey = molstarKey
    }

  }

export interface PhenixSelection {
    molstar_syntax: string | undefined; // code to make molstar StructureSelectionQuery
    phenix_string: string | undefined;  // Phenix string selection
    pandas_string: string | undefined;  // Pandas string selection (mmcif keywords)
    atom_list: any[];                   // List of objects specifying one atom (mmcif keywords)
  }
  
  export class PhenixSelectionClass implements PhenixSelection {
    molstar_syntax: string | undefined = ""; // code to make molstar StructureSelectionQuery
    phenix_string: string | undefined = "";  // Phenix string selection
    pandas_string: string | undefined = "";  // Pandas string selection (mmcif keywords)
    atom_list: any[] = [];       // List of objects specifying one atom (mmcif keywords)
  
    constructor(
      molstar_syntax?: string,
      phenix_string?: string,
      pandas_string?: string,
      atom_list?: any[]
    ) {
      if (molstar_syntax !== undefined) {
        this.molstar_syntax = molstar_syntax;
      }
      if (phenix_string !== undefined) {
        this.phenix_string = phenix_string;
      }
      if (pandas_string !== undefined) {
        this.pandas_string = pandas_string;
      }
      if (atom_list !== undefined) {
        this.atom_list = atom_list;
      }
    }
  
    static from_JSON(jsonString: string): PhenixSelectionClass {
      const jsObj = JSON.parse(jsonString);
      return new PhenixSelectionClass(
        jsObj.molstar_syntax,
        jsObj.phenix_string,
        jsObj.pandas_string,
        jsObj.atom_list
      );
    }
  
    createSelectionQuery(): any {
      if (!this.molstar_syntax) {
        throw new Error("molstar_syntax is undefined");
      }
  
      const query = MS.struct.generator.atomGroups({
        "atom-test": JSON.parse(this.molstar_syntax)
      });
  
      const selectionQuery = StructureSelectionQuery('Selection Query', query, {});
      return selectionQuery;
    }
  }
  
    
// export interface PhenixLocation {
//     phenixKey: string | undefined;
//     phenixSelection: PhenixSelection | undefined;
//   }

// export class PhenixLocationClass implements PhenixLocation {
//     phenixKey: undefined;
//     phenixSelection: undefined;


// End 'Dataclasses'



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
    retrieveRef(refIdAny: string): Ref | undefined { // returns the molstar ref id for either input
        const refMolstar = this.retrieveRefId(refIdAny);
        if (refMolstar) { return this.refObjectStorage[refMolstar]; }
    }
    summarize() {
        return JSON.stringify(this.molstarToExternal);
    }
};

export class TwoWayDictionary<T, U> {
    private forwardMap: Map<T, U>;
    private reverseMap: Map<U, T>;
  
    constructor() {
      this.forwardMap = new Map<T, U>();
      this.reverseMap = new Map<U, T>();
    }
  
    set(key: T, value: U): void {
      this.forwardMap.set(key, value);
      this.reverseMap.set(value, key);
    }
  
    getByKey(key: T): U | undefined {
      return this.forwardMap.get(key);
    }
  
    getByValue(value: U): T | undefined {
      return this.reverseMap.get(value);
    }
  
    deleteByKey(key: T): void {
      const value = this.forwardMap.get(key);
      if (value !== undefined) {
        this.forwardMap.delete(key);
        this.reverseMap.delete(value);
      }
    }
  
    deleteByValue(value: U): void {
      const key = this.reverseMap.get(value);
      if (key !== undefined) {
        this.reverseMap.delete(value);
        this.forwardMap.delete(key);
      }
    }
  
    hasKey(key: T): boolean {
      return this.forwardMap.has(key);
    }
  
    hasValue(value: U): boolean {
      return this.reverseMap.has(value);
    }
  
    clear(): void {
      this.forwardMap.clear();
      this.reverseMap.clear();
    }
  
    get size(): number {
      return this.forwardMap.size;
    }
  }

export type Ref = {
    molstarRefId: string,
    externalRefId: string,
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
        refId: '88'
    }
};

// Mark style query for deletion
// type RepresentationString = 'ball-and-stick' | 'cartoon';
// export type StyleQuery = {
//     refId: string,
//     query: SelectionQuery,
//     color: string,
//     representation: RepresentationString[],
//     focus: boolean,
//     visible: boolean,
// };

// export const DefaultStyle: StyleQuery = {
//     refId: '',
//     query: allSelectionQuery,
//     color: '#ff2a31',
//     representation: ['ball-and-stick', 'cartoon'],
//     focus: false,
//     visible: true,
// };

interface Style {
  iso: number | null;
  color_theme: string | null;
  opacity: number | null;
  representation: string[]; // Assuming it can only be 'ball-and-stick' or 'cartoon'
  visible: boolean | null;
  color: string | null;
}

export class StyleClass implements Style {
  iso: number | null;
  color_theme: string | null;
  opacity: number | null;
  representation: string[];
  visible: boolean | null;
  color: string | null;

  constructor() {
    // Initialize with default values
    this.iso = null;
    this.color_theme = null;
    this.opacity = null;
    this.representation = []; // Default empty, assuming caller will populate
    this.visible = null;
    this.color = null; // Corrected to `string | null` to match the interface
  }
}

export namespace QueryHelper {

    // Mapping function to get the correct function from StructureProperties

    // Adjust the function with proper typings
    function getStructurePropertyFunction(keyword: string): any {
        // keyword is the mmcif keyword, like 'auth_asym_id'

        // Define the mapping with the KeywordMapping type
        const testName =  mapKeywordToTestName(keyword)

        // Ensure the keyword exists in the mapping
        if (!testName) {
            console.error(`Keyword '${keyword}' not in mapping`);
            return null;
        }

        // Check if StructureProperties exists and has the specified property
        if (!StructureProperties || !(testName in StructureProperties)) {
            console.error(`StructureProperties[${keyword}] is undefined`);
            return null;
        }

        // Check if the function exists
        // @ts-ignore
        if (typeof StructureProperties[testName][keyword] !== 'function') {
            console.error(`StructureProperties[${testName}][${keyword}] is not a function`);
            return null;
        }
        // @ts-ignore
        return StructureProperties[testName][keyword];
    }
    function mapKeywordToTestName(keyword: string): string {
        const mapping: any = {
            // 'entity_id': 'entity',
            'asym_id': 'chain',
            'auth_asym_id': 'chain',
            'label_asym_id': 'chain',

            'seq_id': 'residue',
            'auth_seq_id': 'residue',
            'label_seq_id': 'residue',

            'comp_id': 'atom',
            'auth_comp_id': 'atom',
            'label_comp_id': 'atom',

            'atom_id': 'atom',
            "label_atom_id":"atom",
            
            "label_alt_id": "atom",
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
                        const structureFunction = getStructurePropertyFunction(keyword);

                        const elementValue = structureFunction(l.element);
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
        const sel = StructureQuery.run(QueryHelper.getMolstarQuery(param, contextData) as any, contextData);
        return StructureSelection.toLociWithSourceUnits(sel);
    }

}