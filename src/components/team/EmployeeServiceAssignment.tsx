import { useState } from "react";
import { Scissors, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useServices } from "@/hooks/useServices";
import { useEmployeeServices, useToggleEmployeeService } from "@/hooks/useEmployeeServices";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  employeeId: string;
  employeeName: string;
}

const EmployeeServiceAssignment = ({ employeeId, employeeName }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const { data: services } = useServices();
  const { data: assignedServices } = useEmployeeServices(employeeId);
  const toggleService = useToggleEmployeeService();

  const assignedIds = new Set(assignedServices?.map((s) => s.service_id) ?? []);

  const handleToggle = (serviceId: string) => {
    toggleService.mutate({
      employeeId,
      serviceId,
      assigned: assignedIds.has(serviceId),
    });
  };

  const activeServices = services?.filter((s) => s.active) ?? [];
  const assignedCount = assignedIds.size;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Scissors size={12} />
        <span className="font-medium">
          {assignedCount > 0
            ? `${assignedCount} serviço${assignedCount > 1 ? "s" : ""} atribuído${assignedCount > 1 ? "s" : ""}`
            : "Atribuir serviços"}
        </span>
        {expanded ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
              {activeServices.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nenhum serviço cadastrado.</p>
              ) : (
                activeServices.map((service) => {
                  const isAssigned = assignedIds.has(service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => handleToggle(service.id)}
                      disabled={toggleService.isPending}
                      className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                        isAssigned
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : "hover:bg-secondary/50 text-muted-foreground border border-transparent"
                      }`}
                    >
                      <span className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                        isAssigned ? "bg-accent text-accent-foreground" : "border border-muted-foreground/30"
                      }`}>
                        {isAssigned && <Check size={10} />}
                      </span>
                      <span className="flex-1 truncate">{service.name}</span>
                      <span className="text-[10px] opacity-60">
                        R$ {Number(service.price).toFixed(2)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeServiceAssignment;
