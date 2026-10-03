package com.dawai.dawai_app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.app.DownloadManager
import android.content.Context
import android.os.Environment
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    companion object {
        private const val UPDATE_CHANNEL = "com.dawai.dawai_app/updates"
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, UPDATE_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "canInstallApks" -> result.success(canInstallApks())
                    "requestInstallPermission" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !canInstallApks()) {
                            val intent = Intent(
                                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:$packageName"),
                            )
                            startActivity(intent)
                        }
                        result.success(null)
                    }
                    "downloadAndInstallApk" -> {
                        val url = call.argument<String>("url")
                        if (url == null || !isTrustedDownloadUrl(url)) {
                            result.error("invalid_url", "رابط التحديث غير صالح.", null)
                        } else if (!canInstallApks()) {
                            result.error(
                                "install_permission_required",
                                "اسمح للتطبيق بتثبيت التحديثات أولاً.",
                                null,
                            )
                        } else {
                            try {
                                enqueueApkDownload(url)
                                result.success(null)
                            } catch (error: Exception) {
                                result.error("download_failed", error.message, null)
                            }
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun canInstallApks(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O || packageManager.canRequestPackageInstalls()

    private fun isTrustedDownloadUrl(url: String): Boolean {
        val uri = Uri.parse(url)
        return uri.scheme == "https" &&
            uri.host == "github.com" &&
            uri.pathSegments.size >= 5 &&
            uri.pathSegments[0] == "mohammed5ibrahim5" &&
            uri.pathSegments[1] == "pharmacy" &&
            uri.pathSegments[2] == "releases" &&
            uri.pathSegments[3] == "download"
    }

    private fun enqueueApkDownload(url: String) {
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle("تحديث تطبيق دواي")
            .setDescription("جارٍ تنزيل التحديث. سيظهر التثبيت بعد اكتمال التنزيل.")
            .setMimeType("application/vnd.android.package-archive")
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(false)
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(
                this,
                Environment.DIRECTORY_DOWNLOADS,
                "dawai-app-update.apk",
            )

        val downloadManager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        downloadManager.enqueue(request)
    }
}
