import { Loci } from '../../mol-model/loci';
import { StructureElement } from '../../mol-model/structure';
import { clearStructureOverpaint } from '../../mol-plugin-state/helpers/structure-overpaint';
import { StructureQueryHelper } from '../../mol-plugin-state/helpers/structure-query';
import { StructureComponentManager } from '../../mol-plugin-state/manager/structure/component';
import { PluginStateObject } from '../../mol-plugin-state/objects';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { PluginCommands } from '../../mol-plugin/commands';
import { Color } from '../../mol-util/color';
import { ParamDefinition } from '../../mol-util/param-definition';
import { CreateVolumeStreamingBehavior, CreateVolumeStreamingInfo, InitVolumeStreaming } from '../../mol-plugin/behavior/dynamic/volume-streaming/transformers';
import { Viewer } from './app';
import { allSelectionQuery, debugQuery, DefaultStyle, getLocationArray, queryFromLoci, QueryHelper, Ref, RefMap, SelectionQuery, StyleQuery } from './helpers';
import { StateSelection } from '../../mol-state';

export namespace Phenix {
    export function cameraMode(this: Viewer) {
        if (this.isFocused) {
            return 'camera-target';
        } else {
            return 'auto';
        }
    }

    export function postInit(this: Viewer) {
        // subscribe hover
        this.plugin.behaviors.interaction.hover.subscribe(ev => {
            if (StructureElement.Loci.is(ev.current.loci)) {
                // console.log('hover');
                const l = StructureElement.Loci.getFirstLocation(ev.current.loci);
                if (l) {
                    // Hover related logic...
                }
            }
        });

        // subscribe click
        this.plugin.behaviors.interaction.click.subscribe(ev => {
            if (StructureElement.Loci.is(ev.current.loci)) {
                console.log('click');
                const l = StructureElement.Loci.getFirstLocation(ev.current.loci);
                if (l) {
                    // Click related logic...
                    this.isFocused = true;
                }
            }
        });
    }

    export function getLociForParams(this: Viewer, query: SelectionQuery): Loci | undefined {
        if (query.params.refId === '') {
            throw new Error('Provide a reference');
        }
        const ref = this.refMapping.retrieveRef(query.params.refId);
        if (ref) {
            const refId = ref.molstarRefId;
            // const assemblyRef = this.plugin.managers.structure.hierarchy.current.structures[0].cell.transform.ref;
            const data = (this.plugin.state.data.select(refId)[0].obj as PluginStateObject.Molecule.Structure).data;
            return QueryHelper.getInteractivityLoci(query, data);
        }
    }

    export async function loadStructureFromPdbString(this: Viewer, data: string, format: string, label: string, external_ref_id: string, style: StyleQuery = { ... DefaultStyle }) {
        this.hasSynced = false;
        const _data = await this.plugin.builders.data.rawData({ data: data, label: label });
        // @ts-ignore
        const trajectory = await this.plugin.builders.structure.parseTrajectory(_data, format);
        await this.plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');


        // Manage reference ids
        console.log('Adding model with external refId: ', external_ref_id);
        const structures = this.plugin.managers.structure.hierarchy.current.structures;
        const newRefIds: string[] = [];
        const newStructures: any[] = [];
        structures.forEach((structure) => {
            const refId = structure.cell.transform.ref;
            if (!this.refMapping.hasRefId(refId)) {
                newRefIds.push(refId);
                newStructures.push(structure);
            };
        });
        if (newRefIds.length !== 1) {
            throw new Error(`The length of unpaired refs is ${newRefIds.length}, but expected 1 after load operation`);
        }
        const newRef: Ref = {
            molstarRefId: newRefIds[0],
            externalRefId: external_ref_id,
            // structure: newStructures[0], // or any other value
        };
        this.refMapping.addRef(newRef);


        // do another ref map to map the refId to the data id (Still unclear the difference)
        // need to isolate a single structure

        const newRefData: Ref = {
            molstarRefId: newRefIds[0],
            // @ts-ignore
            externalRefId: structures[0].model.cell.obj.data.id,
        };
        this.refMapping_data.addRef(newRefData);
        // console.log(this.refMapping.summarize()); // DEBUG
        this.hasSynced = true;
    }


    export function pollStructures(this: Viewer) {

        const refs: string[] = [];
        const structures = this.plugin.managers.structure.hierarchy.current.structures;
        structures.forEach((structure) => {
            const ref = structure.cell.transform.ref;
            if (ref) {
                refs.push(ref);
            }
        });
        return JSON.stringify(refs);
    }
    export function getSyncResult(this: Viewer) {
        if (this.hasVolumes && !this.phenix.volumeRefInfo().params.values.entries) { this.hasSynced = false; }
        let volumeData = {};
        if (this.hasVolumes) {
            const volumeEntries = JSON.stringify(this.phenix.volumeRefInfo().params.values.entries);
            if (volumeEntries) { volumeData = volumeEntries; };
            console.log('volumeData: ', volumeData);
        }
        const result = { hasSynced: this.hasSynced, refMapping: JSON.stringify(this.refMapping.molstarToExternal), volumeEntries: JSON.stringify(volumeData) };
        // if (this.hasSynced) { this.hasSynced = false; } // flip the sync toggle
        return JSON.stringify(result);

    }

    export function queryFromJSON(query: string) {
        return (JSON.parse(query) as SelectionQuery);
    }

    export function getQueryFromLoci(this: Viewer, loci: Loci) {
        // console.log("get query from loci")
        // @ts-ignore
        const data_id = loci.structure.state.model.id;
        // console.log(data_id)
        const ref_id_molstar = this.refMapping_data.retrieveRefId(data_id); // returns the 'other'
        // console.log(ref_id_molstar)
        if (ref_id_molstar) {
            const ref = this.refMapping.retrieveRef(ref_id_molstar);
            // console.log(ref.externalRefId)
            const query = queryFromLoci(loci);
            // @ts-ignore
            query.params.refId = ref.externalRefId;
            return query;
        }
    }
    export function getQueryJSONFromLoci(this: Viewer, loci: Loci) {
        const query = this.phenix.getQueryFromLoci(loci);
        const queryJSON = JSON.stringify(query);
        return queryJSON;
    }

    export function pollSelection(this: Viewer): string {
        const loci = this.phenix.getSelectedLoci();
        const query = this.phenix.getQueryFromLoci(loci);
        return JSON.stringify(query);
    }
    export async function select(this: Viewer, query: SelectionQuery) {

        // get query as a loci
        const loci = this.phenix.getLociForParams(query);

        // if empty, stop
        if (Loci.isEmpty(loci)) {
            return;
        }

        // // set non selected theme color
        // if (query.nonSelectedColor) {
        //     for await (const s of structureData) {
        //         await this.plugin.managers.structure.component.updateRepresentationsTheme(s.components, { color: params.colorMode, colorParams: { value: this.normalizeColor(params.nonSelectedColor) } });
        //     }
        // }

        // set default selection color (can remove?)
        this.phenix.setColor({ select: { r: 255, g: 112, b: 3 }, highlight: { r: 255, g: 112, b: 3 } });

        // apply selection
        this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });

        // focus loci
        this.plugin.managers.camera.focusLoci(loci);
    }
    export function setColor(this: Viewer, param: { highlight?: any, select?: any }) {
        if (!this.plugin.canvas3d) return;

        const renderer = this.plugin.canvas3d.props.renderer;
        const rParam: any = {};

        if (param.highlight) {
            rParam['highlightColor'] = this.phenix.normalizeColor(param.highlight);
        }

        if (param.select) {
            rParam['selectColor'] = this.phenix.normalizeColor(param.select);
        }

        PluginCommands.Canvas3D.SetSettings(this.plugin, {
            settings: {
                renderer: {
                    ...renderer,
                    ...rParam
                }
            }
        });

        if (rParam.highlightColor) {
            this.isHighlightColorUpdated = true;
        }
    }
    export function normalizeColor(colorVal: any, defaultColor?: Color) {
        let color = Color.fromRgb(170, 170, 170);
        try {
            if (typeof colorVal.r !== 'undefined') {
                color = Color.fromRgb(colorVal.r, colorVal.g, colorVal.b);
            } else if (colorVal[0] === '#') {
                color = Color(Number(`0x${colorVal.substr(1)}`));
            } else {
                color = Color(colorVal);
            }
        } catch (e) {
            if (defaultColor) color = defaultColor;
        }
        return color;
    }

    export async function clearSelection(this: Viewer) {
        this.plugin.managers.interactivity.lociSelects.deselectAll();
        // reset theme to default
        // if (this.selectedParams && this.selectedParams.nonSelectedColor) {
        //   this.visual.reset({ theme: true });
        // }
        // remove overpaints
        await clearStructureOverpaint(this.plugin, this.plugin.managers.structure.hierarchy.current.structures[0].components);

        // remove selection representations
        if (this.selectedParams && this.selectedParams.addedRepr) {
            const selReprCells: any = [];
            for (const s of this.plugin.managers.structure.hierarchy.current.structures) {
                for (const c of s.components) {
                    if (c.cell && c.cell.params && c.cell.params.values && c.cell.params.values.label === 'selection-by-script') {
                        selReprCells.push(c.cell);
                    }
                }
            }
            if (selReprCells.length > 0) {
                for await (const selReprCell of selReprCells) {
                    await PluginCommands.State.RemoveObject(this.plugin, { state: selReprCell.parent!, ref: selReprCell.transform.ref });
                }
            }
        }
        this.selectedParams = undefined;
    }

    export function clearAll(this: Viewer) {
        // this.clearSelection();
        this.plugin.clear();
        this.plugin.build();
        this.refMapping = new RefMap();
        this.refMapping_data = new RefMap();
        this.refMapping_volume = {};
        this.hasSynced = true;
        // this.hasVolumes = false;
    }
    export async function deselectAll(this: Viewer) {
        this.plugin.managers.interactivity.lociSelects.deselectAll();
    }
    export function getQueryAll(this: Viewer, refId: string) {
        const ref = this.refMapping.retrieveRef(refId);
        const query = { ...allSelectionQuery };
        // @ts-ignore
        query.params.refId = ref.molstarRefId;
        return query;
    }
    export function getQueryDebug(this: Viewer, refId: string) {
        const ref = this.refMapping.retrieveRef(refId);
        const query = { ...debugQuery };
        // @ts-ignore
        query.params.refId = ref.molstarRefId;
        return query;
    }
    export function getThemeParams(this: Viewer) {
        const themeParams = StructureComponentManager.getThemeParams(this.plugin, this.plugin.managers.structure.component.pivotStructure);
        const theme = ParamDefinition.getDefaultValues(themeParams);

        // color
        theme.action.name = 'color';
        theme.action.params = { color: Color.fromRgb(255, 112, 3), opacity: 1 };

        // transparency
        // theme.action.name = 'transparency'
        // theme.action.params = { value: 1.0 };
        return theme;
    }
    export async function addRepr(this: Viewer, query: SelectionQuery, reprName: string) {

        // // Structure list to apply selection
        // const ref = this.refMapping.retrieveRef(query.params.refId);
        // const oldStyle = ref.style;

        const loci = this.phenix.getLociForParams(query);
        // console.log('loci: ', loci);
        if (Loci.isEmpty(loci)) return;

        this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });
        const defaultParams = StructureComponentManager.getAddParams(this.plugin, { allowNone: false, hideSelection: true, checkExisting: true });
        const defaultValues = ParamDefinition.getDefaultValues(defaultParams);
        defaultValues.options = { label: 'selection-by-script', checkExisting: true };
        const values = { ...defaultValues, ...{ representation: reprName } };
        const structures = this.plugin.managers.structure.hierarchy.getStructuresWithSelection();
        await this.plugin.managers.structure.component.add(values, structures);
        this.plugin.managers.camera.reset();
        this.phenix.deselectAll();
    }

    export async function removeRepr(this: Viewer, query: SelectionQuery, reprName: string) {
        // Structure list to apply selection
        // const ref = this.refMapping.retrieveRef(query.params.refId);

        const loci = this.phenix.getLociForParams(query);
        // console.log('loci: ', loci);
        if (Loci.isEmpty(loci)) return;

        this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });
    }

    export function checkSingleEntry<K, V>(map: Map<K, V>): { key: K; value: V } | never {
        if (map.size === 1) {
            const entry = map.entries().next().value;
            const [key, value] = entry;
            return { key, value };
        } else if (map.size > 1) {
            console.log('map object contents:');
            map.forEach((value, key) => {
                console.log(`Key: ${key}, Value: ${value}`);
            });
            throw new Error('The map has more than one entry.',);
        } else {
            throw new Error('The map is empty.');
        }
    }
    export function getSel(this: Viewer) {
        // @ts-ignore
        return this.plugin.managers.interactivity.lociSelects.sel;
    }
    export function getStructureForRef(this: Viewer, ref: Ref) {
        const structures = this.plugin.managers.structure.hierarchy.current.structures.filter(e => e.cell.transform.ref === ref.molstarRefId);
        if (structures.length !== 1) {
            throw new Error(`Expected structures array for ref ${ref.molstarRefId} to be size 1, but got ${structures.length}`);
        }
        return structures[0];
    }
    export function getSelectedLoci(this: Viewer): Loci {
        const entry_map = this.phenix.getSel().entries;
        const result = this.phenix.checkSingleEntry(entry_map);
        const loci = result.value.selection;
        return loci;
    }
    export function getSelectedQuery(this: Viewer): SelectionQuery {
        // Note: this is incomplete because it doesn't account cross-model selections
        const entry_map = this.phenix.getSel().entries;
        const result = this.phenix.checkSingleEntry(entry_map);
        const loci = result.value.selection;
        const query = this.phenix.getQueryFromLoci(loci);
        return query;
    }

    export function getLocations(this: Viewer, loci: Loci) {
        return getLocationArray(loci);
    }

    export function getLociStats(this: Viewer, loci: Loci) {
        // @ts-ignore
        return StructureElement.Stats.ofLoci(loci);
    }
    export function getColorOfSelection(this: Viewer, query: SelectionQuery) {
        const ref = this.refMapping.retrieveRef(query.params.refId);
        // @ts-ignore
        const themeParams = StructureComponentManager.getThemeParams(this.plugin, ref.structure);
        const colorValue = ParamDefinition.getDefaultValues(themeParams);
        return colorValue;
    }


    export async function setQueryColor(this: Viewer, query: SelectionQuery, value: number) {

        const ref = this.refMapping.retrieveRef(query.params.refId);
        const structureData = this.phenix.getStructureForRef(ref);

        const loci = this.phenix.getLociForParams(query);
        if (Loci.isEmpty(loci)) return;

        this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });
        const themeParams = StructureComponentManager.getThemeParams(this.plugin, structureData);
        const themeValues = ParamDefinition.getDefaultValues(themeParams);
        themeValues.action.name = 'color';
        themeValues.action.params = { color: this.phenix.normalizeColor(value), opacity: 1 };
        await this.plugin.managers.structure.component.applyTheme(themeValues, [structureData]);
    }
    export function getRepresentationNames(this: Viewer, query: SelectionQuery) {
        const ref = this.refMapping.retrieveRef(query.params.refId);
        const structure = this.phenix.getStructureForRef(ref);
        const names = structure.components[0].representations.map((rep: any) => rep.cell.params.values.type.name);
        return names;
    }

    export async function getRepresentation(this: Viewer, query: SelectionQuery, representation_name: string, strict: boolean) {
        if (!strict) { strict = false; };
        const ref = this.refMapping.retrieveRef(query.params.refId);
        const structure = this.phenix.getStructureForRef(ref);
        const names = this.phenix.getRepresentationNames(query);
        const reprs = structure.components[0].representations.filter((rep: any) =>rep.cell.params.values.type.name === representation_name);
        if (reprs.length !== 1 && !strict) {
            await this.phenix.addRepr(query, representation_name);
            return this.phenix.getRepresentation(query, representation_name, true);
        } else if (reprs.length !== 1 && strict) {
            throw new Error(`Expected representation array that matches name '${representation_name}' to be size 1, but names: ${names}`);
        } else {
            return reprs[0];
        }
    }


    export async function setTransparencyFromQuery(this: Viewer, query: SelectionQuery, representation_name: string, value: number) {
        // reference: https://github.com/molstar/molstar/issues/149
        const ref = this.refMapping.retrieveRef(query.params.refId);
        const structure = this.phenix.getStructureForRef(ref);
        const representation = await this.phenix.getRepresentation(query, representation_name);
        const repr = representation.cell;
        if (ref) {
            const data = (this.plugin.state.data.select(ref.molstarRefId)[0].obj as PluginStateObject.Molecule.Structure).data;
            const sel = QueryHelper.getSelFromQuery(query, data);
            // @ts-ignore

            const { selection } = StructureQueryHelper.createAndRun(structure.cell.obj!.data.root, sel);
            const bundle = StructureElement.Bundle.fromSelection(selection);

            const update = this.plugin.build();

            // if you have more than one repr to apply this to, do this for each of them
            update.to(repr).apply(StateTransforms.Representation.TransparencyStructureRepresentation3DFromBundle, {
                layers: [{ bundle, value: value }]
            });

            return update.commit();
        }
    }
    export function toggleSelectionMode(this: Viewer, isVisible: boolean) {
        if (!isVisible) {
            // console.log('Clearing selection');
            this.plugin.managers.interactivity.lociSelects.deselectAll();
            this.phenix.clearSelection();
        }
        this.plugin.behaviors.interaction.selectionMode.next(isVisible);
    }

    export async function loadMap(this: Viewer, refIdModel: string, refIdMap: string) {
        this.hasSynced = false;
        const refIdMolstar = this.refMapping.retrieveRefId(refIdModel);
        const params = this.phenix.mapParams(refIdMolstar, refIdMap);
        // @ts-ignore

        await this.plugin.runTask(this.plugin.state.data.applyAction(InitVolumeStreaming, params, refIdMolstar));
        this.hasVolumes = true;
        this.hasSynced = true;
    }

    export function mapParams(this: Viewer, refId: string, volumeId: string) {
        // console.log('assemblyRef', assemblyRef);
        // console.log('refs:', this.plugin.managers.structure.hierarchy.current.refs);
        const asm = this.plugin.state.data.select(refId)[0].obj!;
        // console.log('asm', asm);
        const mapParams = InitVolumeStreaming.createDefaultParams(asm, this.plugin);
        const id = volumeId;
        mapParams.entries = [{ id: id }];
        // mapParams.method = source;
        mapParams.options.serverUrl = this.volumeServerURL;
        // if (!this.volumeStreamingRef) {
        const volumeStreamingRef = 'volume-streaming' + '' + Math.floor(Math.random() * Math.floor(100));
        mapParams.options.behaviorRef = volumeStreamingRef;
        this.refMapping_volume[volumeId] = volumeStreamingRef;
        // mapParams.defaultView = 'camera-target';
        // this.volumeStreamingRef = volumeStreamingRef;
        // }
        return mapParams;
    }

    export function getVolumeEntry(this: Viewer, volumeId: string) {
        const entry = this.phenix.volumeRefInfo().params.values.entries.filter((entry: any) => entry.dataId === volumeId)[0];
        return entry;
    }
    export function volumeRefInfo(this: Viewer) {
        const refs = this.plugin.state.data.select(StateSelection.Generators.ofTransformer(CreateVolumeStreamingInfo));
        // const refs = this.plugin.state.data.select(StateSelection.Generators.ofTransformer(CreateVolumeStreamingBehavior));
        return refs[0];
    }
    export function volumeRefBehavior(this: Viewer) {
        const refs = this.plugin.state.data.select(StateSelection.Generators.ofTransformer(CreateVolumeStreamingBehavior));
        // console.log('length of behavior refs: ', refs.length);
        return refs[0];
    }


}

