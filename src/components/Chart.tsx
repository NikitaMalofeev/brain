"use client";
import {
    AreaChart,
    Area,
    ResponsiveContainer
} from "recharts";

type Props = {
    current: number;
};

const data = [
    { name: "Шаг 1", value: 0 },
    { name: "Шаг 2", value: 5 },
    { name: "Шаг 3", value: 37 },
    { name: "Шаг 4", value: 45 },
    { name: "Шаг 5", value: 44 },
    { name: "Шаг 5", value: 43 },
    { name: "Шаг 6", value: 50 },
    { name: "Шаг 7", value: 71 },
    { name: "Шаг 8", value: 80 },
];
const marksAt = [1, 4, 7]; // индексы для рисок

export default function HealingChartRecharts({ current }: Props) {
    return (
        <div className="w-[calc(100%+10px)] h-[80px] -mx-[5px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#575DFF" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#575DFF" stopOpacity={0} />
                        </linearGradient>
                    </defs>



                    <Area
                        type="basis"
                        dataKey="value"
                        stroke="#89BFED"
                        fill="url(#gradientFill)"
                        strokeWidth={2}
                        dot={(props) => {
                            const { cx, cy, index } = props;

                            // ✦ для текущего прогресса
                            if (index === current) {
                                return (
                                    <svg key={`current-${index}`} x={cx}
                                        y={cy - 20} width="16" height="16" fill="none"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M2.59959 7.50946L6.46246 6.10418L7.86774 2.24131C7.90019 2.1531 7.95892 2.07696 8.03601 2.02317C8.1131 1.96939 8.20483 1.94055 8.29883 1.94055C8.39282 1.94055 8.48456 1.96939 8.56165 2.02317C8.63874 2.07696 8.69747 2.1531 8.72992 2.24131L10.1352 6.10418L13.9981 7.50946C14.0863 7.54191 14.1624 7.60064 14.2162 7.67773C14.27 7.75482 14.2988 7.84656 14.2988 7.94055C14.2988 8.03455 14.27 8.12628 14.2162 8.20337C14.1624 8.28046 14.0863 8.33919 13.9981 8.37164L10.1352 9.77692L8.72992 13.6398C8.69747 13.728 8.63874 13.8041 8.56165 13.8579C8.48456 13.9117 8.39282 13.9406 8.29883 13.9406C8.20483 13.9406 8.1131 13.9117 8.03601 13.8579C7.95892 13.8041 7.90019 13.728 7.86774 13.6398L6.46246 9.77692L2.59959 8.37164C2.51137 8.33919 2.43523 8.28046 2.38145 8.20337C2.32767 8.12628 2.29883 8.03455 2.29883 7.94055C2.29883 7.84656 2.32767 7.75482 2.38145 7.67773C2.43523 7.60064 2.51137 7.54191 2.59959 7.50946Z"
                                            fill="white" stroke="#63A1D6" strokeWidth="3" strokeLinecap="round"
                                            strokeLinejoin="round" />
                                    </svg>

                                )
                                    ;
                            }

                            // Риски в указанных точках
                            if (marksAt.includes(index)) {
                                return (
                                    <line
                                        key={`mark-${index}`}
                                        x1={cx}
                                        y1={cy - 3 - (index === 1 ? 3 : 0)}
                                        x2={cx}
                                        y2={cy + 3 - (index === 1 ? 3 : 0)}
                                        stroke="#7BB7FF"
                                        strokeWidth={4}
                                        strokeLinecap="round"
                                    />
                                );
                            }

                            return <g key={`empty-${index}`} />;
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
