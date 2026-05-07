# Multi-Pipeline Integration Plan

## Information Gathered
```
✅ File structure: PipelineSelect, usePipelineStore, pipelineService, types/pipelines.ts, leads pipeline_id/stage_id
✅ Leads have pipeline_id/stage_id (types/leads.ts)
✅ Current Pipeline.tsx uses fixed COLUMNS - replace with dynamic stages
```

## Plan
1. **Add PipelineSelect** header (left of title)
2. **usePipelineStore integration** - fetch/set currentPipelineId
3. **Dynamic columns** - COLUMNS → currentPipeline.stages
4. **Filter leads** - by currentPipelineId/stage_id
5. **Drag/drop** - update lead.pipeline_id/stage_id
6. **Fallback** - single pipeline → 'default' pipeline_id
7. **No visual changes** - same layout/colors

## Dependent Files
```
src/pages/Pipeline.tsx (main)
src/store/usePipelineStore.ts (add)
src/store/useLeadStore.ts (filter by pipeline)
```

## Follow-up
1. Run `pipeline_schema.sql`
2. `npm run dev`
3. Test pipeline switch + drag/drop

Confirm plan?

