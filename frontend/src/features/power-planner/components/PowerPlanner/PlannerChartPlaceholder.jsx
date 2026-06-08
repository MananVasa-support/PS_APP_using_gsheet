import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PlannerCard from "./PlannerCard";

const PlannerChartPlaceholder = ({ data = [] }) => {
  return (
    <PlannerCard
      title="Execution Rhythm"
      description="Placeholder trend view for planned versus completed output."
      className="h-full"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #fee2e2",
                boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              }}
            />
            <Line
              type="monotone"
              dataKey="planned"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line type="monotone" dataKey="completed" stroke="#18181b" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </PlannerCard>
  );
};

export default PlannerChartPlaceholder;
