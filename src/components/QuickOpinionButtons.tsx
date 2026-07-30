interface QuickOpinionButtonsProps {
  onSelect: (opinion: string) => void
}

const commonOpinions = [
  { label: '同意', opinion: '经审核，符合条件，同意通过。' },
  { label: '不同意', opinion: '经审核，不符合条件，不同意通过。' },
  { label: '材料齐全', opinion: '材料齐全，情况属实，同意上报。' },
  { label: '补充材料', opinion: '请补充相关证明材料后重新提交。' },
  { label: '待核实', opinion: '情况待进一步核实，请等待通知。' },
]

export const QuickOpinionButtons = ({ onSelect }: QuickOpinionButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      <span className="text-sm text-gray-500 mr-2">快捷意见：</span>
      {commonOpinions.map((item) => (
        <button
          key={item.label}
          onClick={() => onSelect(item.opinion)}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}