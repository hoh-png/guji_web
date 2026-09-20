import { AVATAR_OPTIONS } from '../../utils/playerStorage.js'

/**
 * 玩家头像。
 *
 * 目前没有头像素材，用国风配色圆牌 + 昵称首字代替；纯 CSS 绘制，不依赖图片。
 */
export function getAvatarOption(avatarId) {
  return AVATAR_OPTIONS.find((a) => a.id === avatarId) || AVATAR_OPTIONS[0]
}

export default function Avatar({ avatarId, nickname, size = 108 }) {
  const option = getAvatarOption(avatarId)
  const initial = (nickname || '修').trim().charAt(0) || '修'

  return (
    <div
      className="avatar-preview"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `linear-gradient(135deg, ${option.color}, ${option.accent})`,
      }}
      aria-label={`头像：${option.name}`}
    >
      {initial}
    </div>
  )
}
