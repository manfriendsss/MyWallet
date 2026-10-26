package top.momia.mywallet;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/** Home-screen shortcut that opens the native shell directly on the add transaction form. */
public class QuickAddWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            Intent intent = new Intent(context, MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("mywallet://quick-add"));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quick_add_widget);
            views.setOnClickPendingIntent(R.id.quick_add_widget, pendingIntent);
            views.setOnClickPendingIntent(R.id.quick_add_button, pendingIntent);
            manager.updateAppWidget(appWidgetId, views);
        }
    }
}
