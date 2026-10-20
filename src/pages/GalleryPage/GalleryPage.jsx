import usePageTitle from '../../hooks/usePageTitle.js'
import './GalleryPage.css'

/**
 * 赏藏品。
 *
 * 目前只做预览：整屏铺满 demo 视频，自动循环播放。
 * 藏品陈列的正式版式待素材确定后再做。
 *
 * 自动播放要求静音（浏览器策略），因此 muted 必须开着；
 * 预览阶段不需要声音，保留画面即可。
 */
export default function GalleryPage() {
  usePageTitle('赏藏品 · 古迹修复系统')

  return (
    <div className="gallery">
      <video
        className="gallery-video"
        src="/media/demo.webm"
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        disableRemotePlayback
      />
    </div>
  )
}
