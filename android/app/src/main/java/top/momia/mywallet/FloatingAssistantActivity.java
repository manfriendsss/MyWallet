package top.momia.mywallet;

import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

/** Compact chat activity shown above the launcher from the home-screen widget. */
public class FloatingAssistantActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        DisplayMetrics metrics = new DisplayMetrics();
        getWindowManager().getDefaultDisplay().getMetrics(metrics);
        window.setLayout((int) (metrics.widthPixels * 0.94f), (int) (metrics.heightPixels * 0.82f));

        WindowManager.LayoutParams attributes = window.getAttributes();
        attributes.gravity = Gravity.CENTER;
        window.setAttributes(attributes);
    }
}
