import { createActor } from "@/backend";
import { IncidentStatus, RiskStatus } from "@/backend";
import type {
  CapaRecord,
  CapaStatus,
  EnvironmentRecord,
  IncidentRecord,
  InspectionRecord,
  InspectionStatus,
  ObservationRecord,
  ObservationStatus,
  PermitRecord,
  PermitStatus,
  RiskRecord,
  TrainingRecord,
  TrainingStatus,
  UserRecord,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useDashboardStats() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getDashboardStats();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useActivityFeed() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["activityFeed"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivityFeed();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15_000,
  });
}

export function useNotifLastRead() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<bigint | null>({
    queryKey: ["notifLastRead"],
    queryFn: async (): Promise<bigint | null> => {
      if (!actor) return null;
      try {
        const result = await (
          actor as unknown as { getNotifLastRead: () => Promise<[] | [bigint]> }
        ).getNotifLastRead();
        // Candid optional ?Int arrives as [] (null) or [value]
        return Array.isArray(result) && result.length > 0
          ? (result[0] as bigint)
          : null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

export function useMarkNotificationsRead() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) return;
      try {
        await (
          actor as unknown as { markNotificationsRead: () => Promise<void> }
        ).markNotificationsRead();
      } catch {
        // Backend method may not exist yet — silently ignore
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifLastRead"] });
    },
  });
}

export function useIncidents() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getIncidents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateIncident() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (incident: IncidentRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createIncident(incident);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      if (variables.status === IncidentStatus.submitted) {
        toast.success(
          "Incident reported — Admin and Safety Officers notified by email",
        );
      } else {
        toast.success("Incident saved as draft");
      }
    },
    onError: () => toast.error("Failed to save incident"),
  });
}

export function useUpdateIncidentStatus() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: { id: string; status: IncidentStatus }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateIncidentStatus(id, status);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["incidents"] });
      const previous = qc.getQueryData<IncidentRecord[]>(["incidents"]);
      qc.setQueryData<IncidentRecord[]>(["incidents"], (old) =>
        old ? old.map((r) => (r.id === id ? { ...r, status } : r)) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["incidents"], ctx.previous);
      toast.error("Failed to update incident status");
    },
    onSuccess: async (_data, { status }) => {
      await qc.invalidateQueries({ queryKey: ["incidents"] });
      await qc.refetchQueries({ queryKey: ["incidents"] });
      const INCIDENT_STATUS_TOASTS: Partial<Record<IncidentStatus, string>> = {
        [IncidentStatus.submitted]:
          "Incident submitted — Admin and Safety Officers notified by email",
        [IncidentStatus.underReview]:
          "Incident under investigation — reporter notified by email",
        [IncidentStatus.approved]:
          "Investigation approved — Admin and Safety Officers notified",
        [IncidentStatus.escalated]:
          "Incident escalated — EHS Manager alerted by email",
        [IncidentStatus.closed]: "Incident closed successfully",
        [IncidentStatus.rejected]: "Incident rejected — reporter notified",
      };
      const msg = INCIDENT_STATUS_TOASTS[status];
      if (msg) toast.success(msg);
    },
  });
}

export function useDeleteIncident() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteIncident(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }),
  });
}

export function usePermits() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["permits"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPermits();
    },
    enabled: !!actor && !isFetching,
  });
}
export function useGetPermit(id: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PermitRecord | null>({
    queryKey: ["permit", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getPermit(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreatePermit() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (permit: PermitRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createPermit(permit);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permits"] });
      toast.success(
        "Permit created — Safety Officer and EHS Manager notified by email",
      );
    },
    onError: () => toast.error("Failed to create permit"),
  });
}

export function useUpdatePermitStatus() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      callerId,
      callerRole,
    }: {
      id: string;
      status: PermitStatus;
      callerId: string;
      callerRole: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updatePermitStatus(
        id,
        status,
        callerId,
        callerRole,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["permits"] });
      const previous = qc.getQueryData<PermitRecord[]>(["permits"]);
      qc.setQueryData<PermitRecord[]>(["permits"], (old) =>
        old ? old.map((r) => (r.id === id ? { ...r, status } : r)) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["permits"], ctx.previous);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["permits"] });
      await qc.refetchQueries({ queryKey: ["permits"] });
    },
  });
}

export function useDeletePermit() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deletePermit(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permits"] }),
  });
}

export function useUsers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateUser() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: UserRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createUser(user);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteUser(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User removed successfully");
    },
    onError: () => toast.error("Failed to remove user"),
  });
}

export function useCapas() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["capas"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCapas();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCapa() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (capa: CapaRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createCapa(capa);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capas"] });
    },
    onError: () => toast.error("Failed to create CAPA"),
  });
}

export function useDeleteCapa() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteCapa(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["capas"] }),
  });
}

export function useUpdateCapaStatus() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CapaStatus }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateCapaStatus(id, status);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["capas"] });
      const previous = qc.getQueryData<CapaRecord[]>(["capas"]);
      qc.setQueryData<CapaRecord[]>(["capas"], (old) =>
        old ? old.map((r) => (r.id === id ? { ...r, status } : r)) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["capas"], ctx.previous);
      toast.error("Failed to update CAPA status");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["capas"] });
      await qc.refetchQueries({ queryKey: ["capas"] });
    },
  });
}

export function useObservations() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["observations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getObservations();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteObservation() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteObservation(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["observations"] }),
  });
}

export function useCreateObservation() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (obs: ObservationRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createObservation(obs);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["observations"] }),
  });
}

export function useRisks() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["risks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRisks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteRisk() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteRisk(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risks"] }),
  });
}

export function useInspections() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["inspections"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInspections();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteInspection() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteInspection(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspections"] }),
  });
}

export function useTrainingRecords() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["training"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTrainingRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteTrainingRecord() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteTrainingRecord(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training"] }),
  });
}

export function useEnvironmentRecords() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["environment"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getEnvironmentRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateEnvironmentRecord() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: EnvironmentRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createEnvironmentRecord(record);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["environment"] }),
  });
}

export function useDeleteEnvironmentRecord() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteEnvironmentRecord(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["environment"] }),
  });
}

export function useDepartments() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDepartments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateObservationStatus() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: { id: string; status: ObservationStatus }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateObservationStatus(id, status);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["observations"] });
      const previous = qc.getQueryData<ObservationRecord[]>(["observations"]);
      qc.setQueryData<ObservationRecord[]>(["observations"], (old) =>
        old ? old.map((r) => (r.id === id ? { ...r, status } : r)) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["observations"], ctx.previous);
      toast.error("Failed to update observation status");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["observations"] });
      await qc.refetchQueries({ queryKey: ["observations"] });
    },
  });
}

export function useUpdateRiskStatus() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RiskStatus }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateRiskStatus(id, status);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["risks"] });
      const previous = qc.getQueryData<RiskRecord[]>(["risks"]);
      qc.setQueryData<RiskRecord[]>(["risks"], (old) =>
        old ? old.map((r) => (r.id === id ? { ...r, status } : r)) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["risks"], ctx.previous);
      toast.error("Failed to update risk status");
    },
    onSuccess: async (_data, { status }) => {
      await qc.invalidateQueries({ queryKey: ["risks"] });
      await qc.refetchQueries({ queryKey: ["risks"] });
      const RISK_STATUS_TOASTS: Partial<Record<RiskStatus, string>> = {
        [RiskStatus.submitted]:
          "Risk submitted for review — Safety Officer notified",
        [RiskStatus.approved]:
          "Risk assessment approved — Admin and Safety Officers notified",
      };
      const msg = RISK_STATUS_TOASTS[status];
      if (msg) toast.success(msg);
    },
  });
}

export function useUpdateInspectionStatus() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: { id: string; status: InspectionStatus }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateInspectionStatus(id, status);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections"] });
    },
    onError: () => toast.error("Failed to update inspection status"),
  });
}

export function useUpdateTrainingStatus() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: { id: string; status: TrainingStatus }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateTrainingStatus(id, status);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training"] });
    },
    onError: () => toast.error("Failed to update training status"),
  });
}

export function useUpdateUser() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, user }: { id: string; user: UserRecord }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateUser(id, user);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useActivateUser() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.activateUser(userId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User activated — they can now sign in");
    },
    onError: () => toast.error("Failed to activate user"),
  });
}

export function useCreateInspection() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inspection: InspectionRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createInspection(inspection);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["inspections"] });
      await qc.refetchQueries({ queryKey: ["activityFeed"] });
      toast.success("Inspection scheduled — Safety Officer notified");
    },
    onError: () => toast.error("Failed to schedule inspection"),
  });
}

export function useUpdateInspection() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      inspection,
    }: { id: string; inspection: InspectionRecord }) => {
      if (!actor) throw new Error("Not connected");
      // Backend has updateInspectionStatus; full update = delete + recreate
      const del = await actor.deleteInspection(id);
      if (del.__kind__ === "err") throw new Error(del.err);
      const res = await actor.createInspection(inspection);
      if (res.__kind__ === "err") throw new Error(res.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspections"] }),
  });
}

export function useUpdateObservation() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      observation,
    }: { id: string; observation: ObservationRecord }) => {
      if (!actor) throw new Error("Not connected");
      const del = await actor.deleteObservation(id);
      if (del.__kind__ === "err") throw new Error(del.err);
      const res = await actor.createObservation(observation);
      if (res.__kind__ === "err") throw new Error(res.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["observations"] }),
  });
}

export function useCreateRisk() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (risk: RiskRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createRisk(risk);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risks"] }),
  });
}

export function useCreateTrainingRecord() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: TrainingRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createTrainingRecord(record);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training"] }),
  });
}

export function useUpdateCapa() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, capa }: { id: string; capa: CapaRecord }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateCapa(id, capa);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["capas"] }),
  });
}

export function useSendTestNotification() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.sendTestNotification();
    },
  });
}

export function useRunDeadlineChecks() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.runDeadlineChecks();
    },
  });
}

export function useUpdateIncident() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      incident,
    }: { id: string; incident: IncidentRecord }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateIncident(id, incident);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }),
  });
}

// ─── Principal Registration Hook ────────────────────────────────────────────

/**
 * Bind the caller's IC principal to their employee number.
 * Must be called once after every successful login so the backend
 * can filter the activity feed (and other per-user data) by principal.
 */
export function useRegisterCallerPrincipal() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (employeeNumber: string) => {
      if (!actor) return;
      try {
        await actor.registerCallerPrincipal(employeeNumber);
      } catch {
        // Non-critical — silently ignore if canister is unavailable
      }
    },
  });
}

// ─── Password Reset Hook ─────────────────────────────────────────────────────

export function useResetPasswordByMobile() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({
      employeeNumber,
      mobileNumber,
    }: { employeeNumber: string; mobileNumber: string }) => {
      if (!actor) throw new Error("Not connected");
      const result = await (
        actor as unknown as {
          resetPasswordByMobile: (
            employeeNumber: string,
            mobileNumber: string,
          ) => Promise<
            { __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }
          >;
        }
      ).resetPasswordByMobile(employeeNumber, mobileNumber);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
  });
}

// ─── OTP Hooks ───────────────────────────────────────────────────────────────

export function useSendMobileOtp() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({
      email,
      mobile,
    }: { email: string; mobile: string }) => {
      if (!actor) throw new Error("Not connected");
      const result = await (
        actor as unknown as {
          sendMobileOtp: (
            email: string,
            mobile: string,
          ) => Promise<{ __kind__: string; err?: string }>;
        }
      ).sendMobileOtp(email, mobile);
      if (result.__kind__ === "err")
        throw new Error(result.err ?? "Failed to send OTP");
    },
  });
}

export function useVerifyMobileOtp() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      if (!actor) throw new Error("Not connected");
      const verified = await (
        actor as unknown as {
          verifyMobileOtp: (email: string, otp: string) => Promise<boolean>;
        }
      ).verifyMobileOtp(email, otp);
      return verified;
    },
  });
}

// ─── ESG Hooks ───────────────────────────────────────────────────────────────

export function useESGRecords() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["esg-records"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getESGRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useESGScore() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<number>({
    queryKey: ["esg-score"],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.calculateESGScore();
    },
    enabled: !!actor && !isFetching,
    // No refetchInterval — score is now derived locally in ESGPage from allRecords
    // to keep Overall ESG Score always in sync with pillar scores.
  });
}

export function useCreateESGRecord() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: import("@/backend").ESGRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createESGRecord(record);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["esg-records"] });
      qc.invalidateQueries({ queryKey: ["esg-score"] });
      if (variables.status === "submitted") {
        toast.success(
          "ESG record submitted for approval — Safety Officer notified",
        );
      } else {
        toast.success("ESG record saved as draft");
      }
    },
    onError: () => toast.error("Failed to save ESG record"),
  });
}

export function useUpdateESGRecord() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: import("@/backend").ESGRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateESGRecord(record);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esg-records"] });
      qc.invalidateQueries({ queryKey: ["esg-score"] });
      toast.success("ESG record updated successfully");
    },
    onError: () => toast.error("Failed to update ESG record"),
  });
}

export function useUpdateESGStatus() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      approvedBy,
      approvedAt,
    }: {
      id: string;
      status: import("@/backend").ESGStatus;
      approvedBy: string;
      approvedAt: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateESGStatus(
        id,
        status,
        approvedBy,
        approvedAt,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["esg-records"] });
      const previous = qc.getQueryData<import("@/backend").ESGRecord[]>([
        "esg-records",
      ]);
      qc.setQueryData<import("@/backend").ESGRecord[]>(
        ["esg-records"],
        (old) =>
          old ? old.map((r) => (r.id === id ? { ...r, status } : r)) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["esg-records"], ctx.previous);
      toast.error("Failed to update ESG status");
    },
    onSuccess: async (_data, { status }) => {
      await qc.invalidateQueries({ queryKey: ["esg-records"] });
      await qc.invalidateQueries({ queryKey: ["esg-score"] });
      await qc.refetchQueries({ queryKey: ["esg-records"] });
      if (status === "approved")
        toast.success("ESG record approved — submitter notified");
      else if (status === "rejected")
        toast.success("ESG record rejected — submitter notified");
    },
  });
}

export function useDeleteESGRecord() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteESGRecord(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esg-records"] });
      qc.invalidateQueries({ queryKey: ["esg-score"] });
      toast.success("ESG record deleted");
    },
    onError: () => toast.error("Failed to delete ESG record"),
  });
}
