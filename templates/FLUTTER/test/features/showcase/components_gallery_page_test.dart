import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/features/showcase/presentation/components_gallery_page.dart';

import '../../support/pump_app.dart';

void main() {
  testWidgets('renders the full gallery without layout overflow', (
    tester,
  ) async {
    // A RenderFlex overflow throws during layout, which fails this test —
    // guarding every kit widget against regressions like the EmptyView box.
    // A single pump lays out the whole tree (no data to await). We avoid
    // pumpAndSettle because the "Loading" AppButton spins forever.
    await tester.pumpApp(const ComponentsGalleryPage());

    expect(find.text('Components'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
