import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../../components/museum/Avatar.jsx'
import MuseumHead from '../../components/museum/MuseumHead.jsx'
import CurrencyChip from '../../components/museum/CurrencyChip.jsx'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { getVenueById } from '../../data/props.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import useAutoNotice from '../../hooks/useAutoNotice.js'
import { AVATAR_OPTIONS } from '../../utils/playerStorage.js'
import { ROUTES } from '../../constants/routes.js'

/** 修复师等级：与知识挑战的「修复师等级」对应，暂由玩家自行选择 */
const TITLE_OPTIONS = ['见习修复师', '初级修复师', '中级修复师', '高级修复师', '首席修复师']

const NICKNAME_MAX = 12
const BIO_MAX = 60
const SHOW_DEVELOPMENT_TOOLS = import.meta.env.DEV

/**
 * 个人中心。
 *
 * 只负责「我是谁」——钱囊与档案编辑；
 * 已拥有的道具、场所、工作台都在道具商店里查看与切换，这里不重复展示。
 */
export default function ProfilePage() {
  usePageTitle('个人中心 · 古迹修复系统')

  const { state, notice, clearNotice, saveProfile, gainCurrency, showNotice } = usePlayer()

  const [nickname, setNickname] = useState(state.profile.nickname)
  const [title, setTitle] = useState(state.profile.title)
  const [bio, setBio] = useState(state.profile.bio)
  const [avatarId, setAvatarId] = useState(state.profile.avatarId)
  const [error, setError] = useState('')

  useAutoNotice(notice, clearNotice)

  const venue = getVenueById(state.equippedVenueId)
  const titleRank = Math.max(1, TITLE_OPTIONS.indexOf(state.profile.title) + 1)

  const dirty =
    nickname !== state.profile.nickname ||
    title !== state.profile.title ||
    bio !== state.profile.bio ||
    avatarId !== state.profile.avatarId

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) {
      setError('请先填写昵称')
      showNotice('请先填写昵称', 'error')
      return
    }
    setError('')
    saveProfile({ nickname: trimmed, title, bio: bio.trim(), avatarId })
  }

  function handleReset() {
    const profile = state.profile
    setNickname(profile.nickname)
    setTitle(profile.title)
    setBio(profile.bio)
    setAvatarId(profile.avatarId)
    setError('')
  }

  return (
    <div className="sub-page">
      <div className="wrap">
        <MuseumHead title="个人中心" subtitle="查看钱囊，完善你的修复师档案">
          <CurrencyChip kind="copper" value={state.copper} />
          <CurrencyChip kind="ingot" value={state.ingot} />
          <Link className="btn-ghost" to={ROUTES.SHOP} state={{ from: ROUTES.PROFILE }}>
            前往道具商店
          </Link>
          <Link className="btn-ghost" to={ROUTES.HOME}>
            返回主页
          </Link>
        </MuseumHead>

        <div className="profile-layout">
          {/* 左栏：档案卡 */}
          <div className="card avatar-card">
            <Avatar avatarId={state.profile.avatarId} nickname={state.profile.nickname} />
            <div className="avatar-name">{state.profile.nickname}</div>
            <div className="avatar-title">{state.profile.title}</div>
            <div className="avatar-bio">{state.profile.bio || '这位修复师还没有写下简介。'}</div>

            <div className="stat-row">
              <div className="stat-cell">
                <span className="stat-value">{state.copper}</span>
                <span className="stat-label">铜钱</span>
              </div>
              <div className="stat-cell">
                <span className="stat-value">{state.ingot}</span>
                <span className="stat-label">元宝</span>
              </div>
              <div className="stat-cell">
                <span className="stat-value">{titleRank}</span>
                <span className="stat-label">修复师等级</span>
              </div>
              <div className="stat-cell">
                <span className="stat-value stat-value-text">{venue ? venue.name : '—'}</span>
                <span className="stat-label">当前场所</span>
              </div>
            </div>
          </div>

          {/* 右栏：资料编辑 */}
          <div>
            <form className="card" onSubmit={handleSubmit}>
              <h2>修复师档案</h2>

              <div className="form-grid">
                <div className="form-field">
                  <label>头像配色</label>
                  <div className="avatar-picker">
                    {AVATAR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        title={option.name}
                        aria-label={`头像配色：${option.name}`}
                        className={`avatar-swatch${avatarId === option.id ? ' on' : ''}`}
                        style={{ background: `linear-gradient(135deg, ${option.color}, ${option.accent})` }}
                        onClick={() => setAvatarId(option.id)}
                      />
                    ))}
                  </div>
                  <span className="field-hint">头像素材尚未提供，暂用配色圆牌代替</span>
                </div>

                <div className="form-field">
                  <label htmlFor="nickname">昵称</label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    maxLength={NICKNAME_MAX}
                    placeholder="请输入昵称"
                    onChange={(event) => {
                      setNickname(event.target.value)
                      if (error) setError('')
                    }}
                  />
                  {error ? (
                    <span className="field-error">{error}</span>
                  ) : (
                    <span className="field-hint">
                      {nickname.trim().length}/{NICKNAME_MAX} 字
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="title">修复师等级</label>
                  <select id="title" value={title} onChange={(event) => setTitle(event.target.value)}>
                    {TITLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className="field-hint">等级将随「知识挑战」的答题表现自动评定，当前可手动选择</span>
                </div>

                <div className="form-field">
                  <label htmlFor="bio">个人简介</label>
                  <textarea
                    id="bio"
                    value={bio}
                    maxLength={BIO_MAX}
                    placeholder="介绍一下你自己，或写下正在修复的文物……"
                    onChange={(event) => setBio(event.target.value)}
                  />
                  <span className="field-hint">
                    {bio.trim().length}/{BIO_MAX} 字
                  </span>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: 20 }}>
                <button type="submit" className="btn-primary" disabled={!dirty}>
                  {dirty ? '保存资料' : '资料已是最新'}
                </button>
                <button type="button" className="btn-ghost" onClick={handleReset} disabled={!dirty}>
                  撤销修改
                </button>
              </div>
            </form>

            {/* 仅开发环境展示；操作会写入当前用户的本地测试数据库。 */}
            {SHOW_DEVELOPMENT_TOOLS ? (
              <div className="card">
                <h2>开发测试工具</h2>
                <p>
                  知识挑战奖励功能完善前，可使用下面的按钮测试钱包与兑换流程。
                  每次增加的铜钱或元宝都会写入当前登录用户的测试数据库。
                </p>
                <div className="btn-row" style={{ marginTop: 14 }}>
                  <button type="button" className="btn-ghost" onClick={() => gainCurrency('copper', 1000)}>
                    +1000 铜钱
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => gainCurrency('copper', 5000)}>
                    +5000 铜钱
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => gainCurrency('ingot', 10)}>
                    +10 元宝
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <Link className="btn-back" to={ROUTES.HOME}>
          返回主页
        </Link>
      </div>

      <div className={`toast${notice ? ' show' : ''}`} role="status" aria-live="polite">
        {notice ? notice.text : ''}
      </div>
    </div>
  )
}
