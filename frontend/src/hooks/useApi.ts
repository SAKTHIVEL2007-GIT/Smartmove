import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  DashboardData, Road, Hazard, Junction, Intervention, CitizenReport, CitizenReportCreate,
  PotholeAnalysisResult, TrafficAnalysisResult, AIModelStatus, AIEvent,
  RoadSafetyEvaluation, PrioritizedRepairItem, MunicipalRepairStatus,
  RouteComparisonResult, SmartJunctionDisplayState,
} from '@/types'

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/api/dashboard')).data,
  })
}

// ── Roads ─────────────────────────────────────────────────────────────────────
export function useRoads(params?: { status?: string; min_risk?: number }) {
  return useQuery<Road[]>({
    queryKey: ['roads', params],
    queryFn: async () => (await api.get('/api/roads', { params })).data,
  })
}

// ── Hazards ───────────────────────────────────────────────────────────────────
export function useHazards(params?: { type?: string; severity?: string; road_id?: number }) {
  return useQuery<Hazard[]>({
    queryKey: ['hazards', params],
    queryFn: async () => (await api.get('/api/hazards', { params })).data,
  })
}

// ── Danger Zones / Safety Evaluations ────────────────────────────────────────
export function useDangerZones() {
  return useQuery<RoadSafetyEvaluation[]>({
    queryKey: ['danger-zones'],
    queryFn: async () => (await api.get('/api/danger-zones')).data,
  })
}

export function useDangerZone(roadId: number | null) {
  return useQuery<RoadSafetyEvaluation>({
    queryKey: ['danger-zones', roadId],
    queryFn: async () => (await api.get(`/api/danger-zones/${roadId}`)).data,
    enabled: roadId !== null,
  })
}

// ── Repair Priority Queue ─────────────────────────────────────────────────────
export function useRepairPriority() {
  return useQuery<PrioritizedRepairItem[]>({
    queryKey: ['repair-priority'],
    queryFn: async () => (await api.get('/api/repair-priority')).data,
  })
}

export function useUpdateRepairStatus() {
  const queryClient = useQueryClient()
  return useMutation<PrioritizedRepairItem, Error, { id: number; status: MunicipalRepairStatus; assigned_to?: string }>({
    mutationFn: async ({ id, status, assigned_to }) =>
      (await api.patch(`/api/repairs/${id}`, { status, assigned_to })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-priority'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['danger-zones'] })
    },
  })
}

// ── Junctions ─────────────────────────────────────────────────────────────────
export function useJunctions() {
  return useQuery<Junction[]>({
    queryKey: ['junctions'],
    queryFn: async () => (await api.get('/api/junctions')).data,
  })
}

export function useJunctionDisplay(junctionId: number | null) {
  return useQuery<SmartJunctionDisplayState>({
    queryKey: ['junction-display', junctionId],
    queryFn: async () => (await api.get(`/api/junctions/${junctionId}/display`)).data,
    enabled: junctionId !== null,
    refetchInterval: 5000,
  })
}

export function useSimulateJunctionEvent() {
  const queryClient = useQueryClient()
  return useMutation<SmartJunctionDisplayState, Error, { junctionId: number; conflict_type?: string; reset?: boolean }>({
    mutationFn: async ({ junctionId, conflict_type, reset }) =>
      (await api.post(`/api/junctions/${junctionId}/simulate-event`, { conflict_type, reset })).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['junction-display', variables.junctionId] })
      queryClient.invalidateQueries({ queryKey: ['junctions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ── Routes ────────────────────────────────────────────────────────────────────
export function useRouteComparison(originId: number | null, destId: number | null) {
  return useQuery<RouteComparisonResult>({
    queryKey: ['routes', originId, destId],
    queryFn: async () =>
      (await api.get('/api/routes/compare', { params: { origin_id: originId, destination_id: destId } })).data,
    enabled: originId !== null && destId !== null && originId !== destId,
  })
}

// ── Interventions ─────────────────────────────────────────────────────────────
export function useInterventions() {
  return useQuery<Intervention[]>({
    queryKey: ['interventions'],
    queryFn: async () => (await api.get('/api/interventions')).data,
  })
}

// ── Citizen Reports ───────────────────────────────────────────────────────────
export function useCitizenReports() {
  return useQuery<CitizenReport[]>({
    queryKey: ['citizen-reports'],
    queryFn: async () => (await api.get('/api/reports')).data,
  })
}

export function useSubmitReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CitizenReportCreate) =>
      api.post<CitizenReport>('/api/reports', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-reports'] })
      queryClient.invalidateQueries({ queryKey: ['hazards'] })
      queryClient.invalidateQueries({ queryKey: ['danger-zones'] })
    },
  })
}

// ── AI Vision API Hooks ───────────────────────────────────────────────────────

export function useAIModelStatus() {
  return useQuery<AIModelStatus>({
    queryKey: ['ai-status'],
    queryFn: async () => (await api.get('/api/ai/status')).data,
  })
}

export function useAIEvents() {
  return useQuery<AIEvent[]>({
    queryKey: ['ai-events'],
    queryFn: async () => (await api.get('/api/ai/events')).data,
  })
}

export function useAnalyzePothole() {
  const queryClient = useQueryClient()
  return useMutation<PotholeAnalysisResult, Error, { file: File; road_id?: number }>({
    mutationFn: async ({ file, road_id }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (road_id !== undefined && road_id !== null) {
        formData.append('road_id', road_id.toString())
      }
      const response = await api.post('/api/potholes/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryKeyRefetch(queryClient, 'hazards')
      queryKeyRefetch(queryClient, 'roads')
      queryKeyRefetch(queryClient, 'ai-events')
      queryKeyRefetch(queryClient, 'danger-zones')
    },
  })
}

export function useAnalyzeTraffic() {
  const queryClient = useQueryClient()
  return useMutation<TrafficAnalysisResult, Error, { file: File; junction_id?: number }>({
    mutationFn: async ({ file, junction_id }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (junction_id !== undefined && junction_id !== null) {
        formData.append('junction_id', junction_id.toString())
      }
      const response = await api.post('/api/traffic/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryKeyRefetch(queryClient, 'junctions')
      queryKeyRefetch(queryClient, 'ai-events')
      queryKeyRefetch(queryClient, 'danger-zones')
    },
  })
}

function queryKeyRefetch(client: any, key: string) {
  client.invalidateQueries({ queryKey: [key] })
}
